// Icons for each consent scope id (see backend lib/policies.js SCOPES).
export const SCOPE_ICON = {
  read_source: 'file',
  static_analysis: 'code',
  dependency_scan: 'package',
  github_read: 'github',
  web_research: 'globe',
  modify_files: 'doc',
  execute_powershell: 'terminal',
  android_device: 'device',
  browser_automation: 'external',
  background_execution: 'clock',
}

export const RISK_ORDER = ['standard', 'elevated', 'high']

export const RISK_GROUP = {
  standard: { title: 'Read & analyse', hint: 'Look, never touch. Safe to leave on.' },
  elevated: { title: 'Make changes', hint: 'Can change files or act for you. Each change still asks you first.' },
  high: { title: 'Sensitive access', hint: 'Can run with your privileges or access sensitive device content.' },
}

const RISK_DOT = { standard: 'bg-emerald-400', elevated: 'bg-amber-400', high: 'bg-rose-400' }
export const riskDot = (risk) => RISK_DOT[risk] || RISK_DOT.standard
