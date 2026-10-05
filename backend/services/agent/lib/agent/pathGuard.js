import path from "node:path";
import fs from "node:fs/promises";

// Resolves `requested` inside the authorized target root and refuses anything
// that escapes it — including via `..` or a symlink/junction pointing outside.
export const resolveInsideRoot = async (root, requested = ".") => {
  if (typeof requested !== "string") throw new Error("Path must be a string.");
  const realRoot = await fs.realpath(path.resolve(root));
  // Models often write "/" or "/src" meaning the target root, so a leading
  // slash is treated as root-relative. Drive letters and UNC paths still fail.
  const rel = /^[\\/](?![\\/])/.test(requested) ? requested.replace(/^[\\/]+/, "") || "." : requested;
  const candidate = path.resolve(realRoot, rel);

  // Follow symlinks for paths that exist; for paths that don't, check the
  // deepest existing parent instead.
  let real = candidate;
  try {
    real = await fs.realpath(candidate);
  } catch {
    let parent = path.dirname(candidate);
    while (parent !== path.dirname(parent)) {
      try {
        real = path.join(await fs.realpath(parent), path.relative(parent, candidate));
        break;
      } catch {
        parent = path.dirname(parent);
      }
    }
  }

  const fromRoot = path.relative(realRoot.toLowerCase(), real.toLowerCase());
  if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) {
    throw new Error(`Access denied: "${requested}" is outside the authorized target.`);
  }
  return real;
};

// Display a path relative to the target root, with forward slashes.
export const relativeToRoot = (root, p) => path.relative(root, p).split(path.sep).join("/") || ".";
