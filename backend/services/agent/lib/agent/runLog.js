import { AgentRun } from "../../models/agentRun.model.js";

const MAX_LOG_CHARS = 20_000;

// Appends one entry to a run's audit log.
export const logStep = (runId, step) => {
  const entry = { ...step, at: new Date() };
  if (typeof entry.content === "string" && entry.content.length > MAX_LOG_CHARS) {
    entry.content = `${entry.content.slice(0, MAX_LOG_CHARS)}\n… truncated`;
  }
  return AgentRun.updateOne({ _id: runId }, { $push: { steps: entry } });
};

export const finishRun = (runId, fields) =>
  AgentRun.updateOne(
    { _id: runId },
    { $set: { ...fields, pendingApproval: null, finishedAt: new Date() } },
  );
