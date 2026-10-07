# This PC target

The **This PC** target is available only in the Electron desktop launcher
(`npm run desktop`). That launcher enables the target for its local agent
service and binds the agent and gateway to loopback. Hosted and browser-only
services do not enable this target.

Authorize **This PC** from the chat target selector or Settings. It starts with
read-source access only. File tools can inspect accessible local drives; file
paths are absolute (for example, `C:\Users\name\Documents`). Files the agent
reads may be sent to the configured AI provider.

To enable changes or PowerShell, grant the corresponding target permission in
Settings. Every file change and every PowerShell command then requires a
separate approval. Saved "Always allow" rules do not bypass approvals for This
PC. Direct network-share and device paths are refused.
