import mongoose from "mongoose";
import { TARGET_TYPES } from "../lib/policies.js";

// One agent run = one task on one authorized target. `steps` is the audit log:
// every model decision, tool call (allowed or denied) and result, in order, so
// the user can see exactly what the agents did on their system.
const stepSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["thought", "tool_call", "approval_request", "approval", "tool_result", "denied", "context", "error", "final"],
      required: true,
    },
    tool: { type: String, default: "" },
    args: { type: mongoose.Schema.Types.Mixed, default: undefined },
    ok: { type: Boolean, default: undefined },
    content: { type: String, default: "" },
    durationMs: { type: Number, default: undefined },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const agentRunSchema = new mongoose.Schema(
  {
    userUid: { type: String, required: true, index: true },
    authorizationId: { type: mongoose.Schema.Types.ObjectId, ref: "TargetAuthorization", required: true },
    target: {
      type: { type: String, enum: TARGET_TYPES, required: true },
      identifier: { type: String, required: true },
      label: { type: String, default: "" },
    },
    // Conversation (Redis memory) this run belongs to.
    conversationId: { type: String, required: true, index: true },
    task: { type: String, required: true, maxlength: 4000 },
    // Context window: the agent's budget and the latest prompt size reported
    // by the provider.
    contextLimit: { type: Number, default: 0 },
    contextTokensUsed: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["running", "awaiting_approval", "completed", "failed", "cancelled", "interrupted"],
      default: "running",
      index: true,
    },
    // Set while the run is paused waiting for the user to Allow once /
    // Always allow / Decline a change. `rule` is what "Always allow" would
    // save (null when the action can only be allowed once).
    pendingApproval: {
      type: new mongoose.Schema(
        {
          id: { type: String, required: true },
          tool: { type: String, required: true },
          summary: { type: String, default: "" },
          args: { type: mongoose.Schema.Types.Mixed, default: undefined },
          rule: { type: String, default: null },
          requestedAt: { type: Date, default: Date.now },
          expiresAt: { type: Date, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
    toolsOffered: { type: [String], default: [] },
    steps: { type: [stepSchema], default: [] },
    result: { type: String, default: "" },
    error: { type: String, default: "" },
    provider: { type: String, default: "" },
    model: { type: String, default: "" },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

agentRunSchema.index({ userUid: 1, createdAt: -1 });

export const AgentRun = mongoose.model("AgentRun", agentRunSchema);
