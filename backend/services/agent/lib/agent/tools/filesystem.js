import fs from "node:fs/promises";
import path from "node:path";
import { registerTool } from "./registry.js";
import { resolveInsideRoot, relativeToRoot } from "../pathGuard.js";

// Read-only file-system tools, confined to the authorized local target.

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage", "__pycache__", ".venv", "venv"]);
const MAX_FILE_BYTES = 512 * 1024;
const MAX_LIST_ENTRIES = 400;
const MAX_SEARCH_MATCHES = 100;
const MAX_SEARCH_FILES = 3000;

const isProbablyBinary = (buf) => buf.subarray(0, 8000).includes(0);

registerTool({
  name: "list_directory",
  category: "computer",
  description:
    "List files and folders inside the authorized target. Skips node_modules, .git and build output. Use depth > 1 to see nested folders.",
  scope: "read_source",
  targetTypes: ["local"],
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Folder relative to the target root. Default: root." },
      depth: { type: "integer", minimum: 1, maximum: 4, description: "How many levels deep. Default 1." },
    },
  },
  run: async ({ path: p = ".", depth = 1 }, { root }) => {
    const start = await resolveInsideRoot(root, p);
    const maxDepth = Math.min(Math.max(Number(depth) || 1, 1), 4);
    const lines = [];

    const walk = async (dir, level) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
      for (const e of entries) {
        if (lines.length >= MAX_LIST_ENTRIES) return;
        const full = path.join(dir, e.name);
        const indent = "  ".repeat(level);
        if (e.isDirectory()) {
          const skipped = SKIP_DIRS.has(e.name);
          lines.push(`${indent}${e.name}/${skipped ? "  (skipped)" : ""}`);
          if (!skipped && level + 1 < maxDepth) await walk(full, level + 1);
        } else {
          const { size } = await fs.stat(full).catch(() => ({ size: 0 }));
          lines.push(`${indent}${e.name}  (${size} B)`);
        }
      }
    };

    await walk(start, 0);
    if (lines.length >= MAX_LIST_ENTRIES) lines.push(`… truncated at ${MAX_LIST_ENTRIES} entries`);
    return `${relativeToRoot(root, start)}/\n${lines.join("\n") || "(empty)"}`;
  },
});

registerTool({
  name: "read_file",
  category: "computer",
  description:
    "Read a text file inside the authorized target, with line numbers. Use startLine/maxLines for large files. Credentials in the output are masked.",
  scope: "read_source",
  targetTypes: ["local"],
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path relative to the target root." },
      startLine: { type: "integer", minimum: 1, description: "First line to return. Default 1." },
      maxLines: { type: "integer", minimum: 1, maximum: 800, description: "Lines to return. Default 400." },
    },
    required: ["path"],
  },
  run: async ({ path: p, startLine = 1, maxLines = 400 }, { root }) => {
    const file = await resolveInsideRoot(root, p);
    const stat = await fs.stat(file);
    if (!stat.isFile()) throw new Error(`${p} is not a file.`);
    if (stat.size > MAX_FILE_BYTES) throw new Error(`${p} is too large to read (${stat.size} bytes).`);
    const buf = await fs.readFile(file);
    if (isProbablyBinary(buf)) return `${p} is a binary file (${stat.size} bytes); not shown.`;

    const all = buf.toString("utf8").split(/\r?\n/);
    const from = Math.max(Number(startLine) || 1, 1);
    const count = Math.min(Math.max(Number(maxLines) || 400, 1), 800);
    const slice = all.slice(from - 1, from - 1 + count);
    const body = slice.map((l, i) => `${String(from + i).padStart(5)}  ${l}`).join("\n");
    const more = from - 1 + count < all.length ? `\n… ${all.length - (from - 1 + count)} more lines` : "";
    return `${relativeToRoot(root, file)} (${all.length} lines)\n${body}${more}`;
  },
});

registerTool({
  name: "search_files",
  category: "computer",
  description:
    "Search file contents inside the authorized target for a regular expression (case-insensitive). Returns matching lines with file and line number.",
  scope: "read_source",
  targetTypes: ["local"],
  parameters: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "JavaScript regular expression to search for." },
      path: { type: "string", description: "Folder relative to the target root. Default: root." },
      extensions: {
        type: "array",
        items: { type: "string" },
        description: 'Only search these file extensions, e.g. [".js", ".jsx"].',
      },
    },
    required: ["pattern"],
  },
  run: async ({ pattern, path: p = ".", extensions }, { root }) => {
    if (typeof pattern !== "string" || !pattern || pattern.length > 300) {
      throw new Error("Provide a pattern of 1–300 characters.");
    }
    let re;
    try {
      re = new RegExp(pattern, "i");
    } catch (e) {
      throw new Error(`Invalid regular expression: ${e.message}`);
    }
    const exts = Array.isArray(extensions) ? extensions.map((e) => e.toLowerCase()) : null;
    const start = await resolveInsideRoot(root, p);
    const matches = [];
    let filesSeen = 0;

    const walk = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const e of entries) {
        if (matches.length >= MAX_SEARCH_MATCHES || filesSeen >= MAX_SEARCH_FILES) return;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (!SKIP_DIRS.has(e.name)) await walk(full);
          continue;
        }
        if (!e.isFile()) continue;
        if (exts && !exts.includes(path.extname(e.name).toLowerCase())) continue;
        filesSeen += 1;
        const stat = await fs.stat(full).catch(() => null);
        if (!stat || stat.size > MAX_FILE_BYTES) continue;
        const buf = await fs.readFile(full).catch(() => null);
        if (!buf || isProbablyBinary(buf)) continue;
        const lines = buf.toString("utf8").split(/\r?\n/);
        for (let i = 0; i < lines.length && matches.length < MAX_SEARCH_MATCHES; i += 1) {
          if (re.test(lines[i])) {
            matches.push(`${relativeToRoot(root, full)}:${i + 1}: ${lines[i].trim().slice(0, 240)}`);
          }
        }
      }
    };

    await walk(start);
    if (!matches.length) return `No matches for /${pattern}/ in ${filesSeen} files.`;
    const cap = matches.length >= MAX_SEARCH_MATCHES ? `\n… stopped at ${MAX_SEARCH_MATCHES} matches` : "";
    return `${matches.length} matches in ${filesSeen} files searched:\n${matches.join("\n")}${cap}`;
  },
});
