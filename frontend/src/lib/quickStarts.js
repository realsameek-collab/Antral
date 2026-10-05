// Suggested first messages, shown on the dashboard and in an empty chat.
export const QUICK_STARTS = [
  {
    title: 'Security audit',
    icon: 'shieldCheck',
    prompt: 'Audit this project for security vulnerabilities and give me the findings ordered by severity, with fixes.',
  },
  {
    title: 'Find leaked secrets',
    icon: 'key',
    prompt: 'Search this project for hard-coded secrets, API keys and credentials, and tell me where each one is.',
  },
  {
    title: 'Check dependencies',
    icon: 'package',
    prompt: "Scan this project's dependencies for known vulnerabilities and suggest safe upgrades.",
  },
  {
    title: 'Explain the codebase',
    icon: 'code',
    prompt: "Give me an overview of this project's structure, its main components and how they fit together.",
  },
]
