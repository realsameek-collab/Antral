import axios from "axios";
import { registerTool } from "./registry.js";
import { readTargetFile } from "../targetFiles.js";

// Dependency scanner: reads the project's manifest/lockfile and checks every
// pinned package version against the OSV.dev vulnerability database (covers
// GitHub Security Advisories, npm, PyPI and more). Read-only, no API key.

const OSV = "https://api.osv.dev/v1";
const BATCH = 500;
const MAX_DETAILS = 25;

// package-lock.json (v2/v3 "packages", or v1 "dependencies")
const fromPackageLock = (json) => {
  const out = new Map();
  if (json.packages) {
    for (const [key, info] of Object.entries(json.packages)) {
      if (!key || !info.version) continue;
      const name = info.name || key.slice(key.lastIndexOf("node_modules/") + 13);
      out.set(`${name}@${info.version}`, { name, version: info.version, ecosystem: "npm", dev: Boolean(info.dev) });
    }
  } else if (json.dependencies) {
    const walk = (deps) => {
      for (const [name, info] of Object.entries(deps)) {
        if (info.version) out.set(`${name}@${info.version}`, { name, version: info.version, ecosystem: "npm", dev: Boolean(info.dev) });
        if (info.dependencies) walk(info.dependencies);
      }
    };
    walk(json.dependencies);
  }
  return [...out.values()];
};

// package.json only: use the minimum version of each range (less precise).
const fromPackageJson = (json) =>
  ["dependencies", "devDependencies"].flatMap((field) =>
    Object.entries(json[field] || {})
      .map(([name, range]) => {
        const v = /(\d+\.\d+\.\d+[\w.-]*)/.exec(String(range));
        return v ? { name, version: v[1], ecosystem: "npm", dev: field === "devDependencies" } : null;
      })
      .filter(Boolean),
  );

// requirements.txt: only exact pins (name==version) can be checked.
const fromRequirements = (text) =>
  text
    .split(/\r?\n/)
    .map((l) => /^\s*([A-Za-z0-9_.\-[\]]+?)(?:\[.*\])?\s*==\s*([\w.+!-]+)/.exec(l))
    .filter(Boolean)
    .map((m) => ({ name: m[1], version: m[2], ecosystem: "PyPI", dev: false }));

// pyproject.toml [project] dependencies (PEP 621). Like package.json these
// are usually ranges, so the lowest allowed version is checked.
const fromPyproject = (text) => {
  const block = /^\s*dependencies\s*=\s*\[([\s\S]*?)\]/m.exec(text);
  if (!block) return [];
  return [...block[1].matchAll(/["']([A-Za-z0-9_.-]+)(?:\[[^\]]*\])?\s*(?:==|>=|~=)\s*([\w.+!-]+)/g)].map((m) => ({
    name: m[1],
    version: m[2],
    ecosystem: "PyPI",
    dev: false,
  }));
};

const PARSERS = [
  ["package-lock.json", (b) => fromPackageLock(JSON.parse(b))],
  ["package.json", (b) => fromPackageJson(JSON.parse(b))],
  ["requirements.txt", (b) => fromRequirements(b)],
  ["pyproject.toml", (b) => fromPyproject(b)],
];

const severityOf = (vuln) => {
  const s = vuln.database_specific?.severity || vuln.affected?.[0]?.database_specific?.severity;
  return (s || "UNKNOWN").toUpperCase();
};
const RANK = { CRITICAL: 0, HIGH: 1, MODERATE: 2, MEDIUM: 2, LOW: 3, UNKNOWN: 4 };

const fixedIn = (vuln, name) => {
  const versions = (vuln.affected || [])
    .filter((a) => a.package?.name === name)
    .flatMap((a) => (a.ranges || []).flatMap((r) => r.events.filter((e) => e.fixed).map((e) => e.fixed)));
  return versions.length ? versions.join(" / ") : "no fix listed";
};

registerTool({
  name: "scan_dependencies",
  category: "developer",
  description:
    "Check the project's dependencies for known vulnerabilities using the OSV.dev database. Reads package-lock.json (best), " +
    "package.json, requirements.txt or pyproject.toml. Give a folder to scan a sub-project, e.g. 'frontend'.",
  scope: "dependency_scan",
  targetTypes: ["local", "github"],
  parameters: {
    type: "object",
    properties: {
      folder: { type: "string", description: "Folder containing the manifest. Default: root." },
    },
  },
  run: async ({ folder = "" }, ctx) => {
    const dir = String(folder).replace(/[\\/]+$/, "");
    let packages = null;
    let source = "";
    for (const [file, parse] of PARSERS) {
      const path = dir ? `${dir}/${file}` : file;
      try {
        const buf = await readTargetFile(ctx, path);
        packages = parse(buf.toString("utf8"));
        source = path;
        break;
      } catch {
        // try the next manifest type
      }
    }
    if (!packages) return `No package-lock.json, package.json, requirements.txt or pyproject.toml found in "${dir || "/"}".`;
    if (!packages.length) return `${source} lists no pinned dependencies to check.`;

    // 1. Which packages have known vulnerabilities?
    const hits = [];
    for (let i = 0; i < packages.length; i += BATCH) {
      const chunk = packages.slice(i, i + BATCH);
      const { data } = await axios.post(
        `${OSV}/querybatch`,
        { queries: chunk.map((p) => ({ package: { name: p.name, ecosystem: p.ecosystem }, version: p.version })) },
        { timeout: 60_000, signal: ctx.signal },
      );
      data.results.forEach((r, j) => {
        if (r.vulns?.length) hits.push({ pkg: chunk[j], ids: r.vulns.map((v) => v.id) });
      });
    }
    const ranged = /(package\.json|pyproject\.toml)$/.test(source);
    const header = `Scanned ${packages.length} packages from ${source}${ranged ? " (lowest allowed version of each range, not the exact installed version)" : ""}.`;
    if (!hits.length) return `${header}\nNo known vulnerabilities found.`;

    // 2. Details (severity, summary, fixed version) for the findings.
    const ids = [...new Set(hits.flatMap((h) => h.ids))].slice(0, MAX_DETAILS);
    const details = new Map();
    await Promise.all(
      ids.map((id) =>
        axios
          .get(`${OSV}/vulns/${id}`, { timeout: 30_000, signal: ctx.signal })
          .then(({ data }) => details.set(id, data))
          .catch(() => {}),
      ),
    );

    const rows = hits.flatMap(({ pkg, ids: vids }) =>
      vids.map((id) => {
        const v = details.get(id);
        return {
          sev: v ? severityOf(v) : "UNKNOWN",
          line: `${pkg.name}@${pkg.version}${pkg.dev ? " (dev)" : ""} — ${id}${v?.aliases?.length ? ` (${v.aliases.slice(0, 2).join(", ")})` : ""}: ${v?.summary || "see advisory"} · fixed in ${v ? fixedIn(v, pkg.name) : "?"}`,
        };
      }),
    );
    rows.sort((a, b) => (RANK[a.sev] ?? 4) - (RANK[b.sev] ?? 4));
    return [
      header,
      `${hits.length} vulnerable packages, ${rows.length} advisories:`,
      ...rows.map((r) => `[${r.sev}] ${r.line}`),
    ].join("\n");
  },
});
