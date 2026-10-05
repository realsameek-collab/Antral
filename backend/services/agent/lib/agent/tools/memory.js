import { registerTool } from "./registry.js";
import { searchMemory } from "../memory.js";

// Lets the agent recall the user's earlier conversations. It reads only the
// user's own Antral memory, never their system, so it needs no target scope.
registerTool({
  name: "recall_memory",
  category: "memory",
  description:
    "Search the user's earlier conversations with you (other chats, not this one) for something discussed before, " +
    "e.g. a past finding, a fix that was applied, or a preference the user stated. Use specific keywords.",
  scope: null,
  targetTypes: ["*"],
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Keywords to look for, e.g. 'mongodb credential env'." },
    },
    required: ["query"],
  },
  run: async ({ query }, { userUid, conversationId }) => {
    const hits = await searchMemory(userUid, query, { excludeId: conversationId });
    if (!hits.length) return `Nothing in earlier conversations matches "${query}".`;
    return hits
      .map(
        (h) =>
          `• "${h.conversation}" (target ${h.target}, ${h.at.toISOString().slice(0, 10)}, ${h.kind}):\n  ${h.snippet.replace(/\s+/g, " ")}`,
      )
      .join("\n");
  },
});
