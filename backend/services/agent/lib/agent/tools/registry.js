import { isValidScope } from "../../policies.js";

// Central tool registry. Every capability the agents can use is registered here
// with the consent scope it needs, so the executor can enforce permissions the
// same way for every tool — nothing is reachable that is not declared.
//
// A tool definition:
//   name         unique, snake_case — the name the model calls
//   category     "computer" | "browser" | "developer" | "external" | ...
//   description  what the model is told the tool does
//   scope        the SCOPES id that must be granted (and not disabled), or null
//                for tools that never touch the user's system (e.g. memory)
//   targetTypes  target types the tool can act on (e.g. ["local"]), or ["*"]
//   mutating     true if it can change the user's system
//   parameters   JSON schema for the arguments
//   run(args, ctx) -> Promise<string | object>
const tools = new Map();

export const registerTool = (tool) => {
  const required = ["name", "category", "description", "scope", "targetTypes", "parameters", "run"];
  const missing = required.filter((k) => tool[k] === undefined);
  if (missing.length) throw new Error(`Tool ${tool.name || "?"} is missing: ${missing.join(", ")}`);
  if (!/^[a-z][a-z0-9_]*$/.test(tool.name)) throw new Error(`Invalid tool name: ${tool.name}`);
  if (tool.scope !== null && !isValidScope(tool.scope)) throw new Error(`Tool ${tool.name} has unknown scope ${tool.scope}`);
  if (tools.has(tool.name)) throw new Error(`Tool ${tool.name} is already registered`);
  tools.set(tool.name, { mutating: false, ...tool });
};

export const getTool = (name) => tools.get(name);

export const listTools = () => [...tools.values()];

// Tools this run may use: the right target type, scope granted for the target,
// and not switched off account-wide. The model is only ever shown these.
export const availableTools = ({ targetType, grantedScopes, disabledScopes }) =>
  listTools().filter(
    (t) =>
      (t.targetTypes.includes("*") || t.targetTypes.includes(targetType)) &&
      (t.scope === null || (grantedScopes.includes(t.scope) && !disabledScopes.includes(t.scope))),
  );

// Public description for the UI.
export const publicTool = (t) => ({
  name: t.name,
  category: t.category,
  description: t.description,
  scope: t.scope,
  targetTypes: t.targetTypes,
  mutating: t.mutating,
});
