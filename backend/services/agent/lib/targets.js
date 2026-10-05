import { TARGET_TYPES } from "./policies.js";

// Produces a stable identifier for a target so the same repo/path/host always
// matches the same authorization record, however the user typed it.
export const normalizeTarget = (target) => {
  if (!target || typeof target !== "object") return null;

  const type = typeof target.type === "string" ? target.type.trim().toLowerCase() : "";
  let identifier = typeof target.identifier === "string" ? target.identifier.trim() : "";
  const label = typeof target.label === "string" ? target.label.trim().slice(0, 200) : "";

  if (!TARGET_TYPES.includes(type) || !identifier) return null;

  if (type === "github") {
    identifier = identifier.replace(/\/+$/, "").replace(/\.git$/i, "").toLowerCase();
  } else if (type === "host") {
    identifier = identifier.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
  } else if (type === "local") {
    // Collapse separators; lower-case a leading Windows drive letter.
    identifier = identifier.replace(/[\\/]+/g, "/").replace(/\/+$/, "");
    identifier = identifier.replace(/^([a-z]):/i, (_m, d) => `${d.toLowerCase()}:`);
  }

  return { type, identifier, label };
};
