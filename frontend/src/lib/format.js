const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

// "just now", "5 min ago", "yesterday", "3 days ago", then a date.
export function relativeTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 45) return 'just now'
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour')
  if (abs < 7 * 86400) return rtf.format(Math.round(seconds / 86400), 'day')
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}

export function fullDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function daysUntil(value) {
  if (!value) return null
  const ms = new Date(value).getTime() - Date.now()
  return Number.isNaN(ms) ? null : Math.ceil(ms / 86400000)
}

export function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 5) return 'Working late'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// A target's display name: its label, "owner/repo" for GitHub URLs, or the
// last folder of a local path.
export function targetName(authorization) {
  const target = authorization?.target
  if (!target) return 'Unknown target'
  if (target.type === 'computer') return 'Global'
  if (target.label) return target.label
  const id = String(target.identifier || '')
  if (target.type === 'github') {
    const match = /github\.com[/:]([^/\s]+\/[^/\s#?]+?)(?:\.git)?\/?$/i.exec(id)
    if (match) return match[1]
  }
  if (target.type === 'local') {
    const last = id.split(/[\\/]/).filter(Boolean).pop()
    if (last) return last
  }
  return id || 'Unknown target'
}

export const TARGET_TYPE_META = {
  local: { label: 'Local folder', icon: 'folder' },
  computer: { label: 'Global', icon: 'computer' },
  github: { label: 'GitHub repo', icon: 'github' },
  host: { label: 'Host / URL', icon: 'globe' },
  project: { label: 'Project', icon: 'package' },
}
