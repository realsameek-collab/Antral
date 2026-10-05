// Calls to the agent service (through the gateway) for agent runs,
// approvals and conversation memory.
import { request } from "./consentApi.js";

export const startRun = ({ target, task, conversationId, attachments }) =>
  request("/agent/runs", { method: "POST", body: { target, task, conversationId, attachments } });

export const listRuns = () => request("/agent/runs");

export const getRun = (id) => request(`/agent/runs/${id}`);

export const cancelRun = (id) => request(`/agent/runs/${id}/cancel`, { method: "POST" });

export const answerApproval = (runId, approvalId, decision) =>
  request(`/agent/runs/${runId}/approval`, { method: "POST", body: { approvalId, decision } });

export const listConversations = () => request("/agent/conversations");

export const getConversation = (id) => request(`/agent/conversations/${id}`);

export const deleteConversation = (id) => request(`/agent/conversations/${id}`, { method: "DELETE" });

export const getTools = () => request("/agent/tools");

export const getLimits = () => request("/agent/limits");

export const listApprovals = () => request("/agent/approvals");

export const getAlwaysAllow = (authorizationId) => request(`/agent/targets/${authorizationId}/always-allow`);

export const removeAlwaysAllow = (authorizationId, rule) =>
  request(`/agent/targets/${authorizationId}/always-allow`, { method: "DELETE", body: rule ? { rule } : {} });
