// Unrestricted mode: when enabled on a user account, the agent can use all tools
// regardless of scope restrictions. Still logs all actions for audit.

import { listTools } from "./tools/index.js";

const CHUNK_THRESHOLD = 3000; // chars; split tasks larger than this
const CHUNK_SIZE = 2000; // max chars per chunk

export const toolsForUnrestrictedMode = (targetType) =>
  listTools().filter((t) => t.targetTypes.includes("*") || t.targetTypes.includes(targetType));

export const chunkLargeTask = (task) => {
  if (task.length <= CHUNK_THRESHOLD) return [task];

  const chunks = [];
  let remaining = task;

  while (remaining.length > 0) {
    const chunk = remaining.substring(0, CHUNK_SIZE);
    chunks.push(chunk);
    remaining = remaining.substring(CHUNK_SIZE);
  }

  // Add summary instruction to first chunk
  chunks[0] = `${chunks[0]}\n\n[Continuing long task — you will handle this in ${chunks.length} parts. Report progress between parts.]`;

  // Add context to continuation chunks
  for (let i = 1; i < chunks.length; i++) {
    chunks[i] = `Continue from part ${i}: ${chunks[i]}\n\n[Part ${i} of ${chunks.length}]`;
  }

  return chunks;
};

export const isUnrestrictedUser = (user) => user && user.unrestrictedMode === true;
