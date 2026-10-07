// Small stroke icon set (24px grid) so the UI doesn't rely on unicode glyphs,
// which render differently on every platform.
const PATHS = {
  plus: <path d="M12 5v14M5 12h14" />,
  chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z" />,
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="8" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
      <rect x="3.5" y="14.5" width="7" height="6" rx="1.5" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m20.5 16-4.6-4.6a1.5 1.5 0 0 0-2.1 0L5 20" />
    </>
  ),
  library: <path d="M4 19.5V5a1.5 1.5 0 0 1 1.5-1.5H19v14H6a2 2 0 0 0-2 2Zm0 0A2 2 0 0 0 6 21.5h13" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  folder: <path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h3.6l2 2.5h7.4a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />,
  computer: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </>
  ),
  shield: <path d="M12 3 19.5 6v5.6c0 4.6-3.1 8.1-7.5 9.4-4.4-1.3-7.5-4.8-7.5-9.4V6L12 3Z" />,
  shieldCheck: (
    <>
      <path d="M12 3 19.5 6v5.6c0 4.6-3.1 8.1-7.5 9.4-4.4-1.3-7.5-4.8-7.5-9.4V6L12 3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m10.9 12.1 8.6-8.6M16.5 6.5l2.5 2.5M14 9l2 2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  alert: (
    <>
      <path d="M10.3 4.3 2.9 17.5A2 2 0 0 0 4.6 20.5h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  stop: <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  trash: <path d="M4.5 7h15M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l.9 12a1.5 1.5 0 0 0 1.5 1.5h6.2a1.5 1.5 0 0 0 1.5-1.5l.9-12" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  logout: <path d="M14.5 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3M10 16.5 14.5 12 10 7.5M14.5 12H4" />,
  paperclip: <path d="m20 11.5-7.6 7.6a5 5 0 0 1-7.1-7.1l7.8-7.8a3.3 3.3 0 0 1 4.7 4.7l-7.8 7.8a1.7 1.7 0 0 1-2.4-2.4l7.2-7.2" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.4-4.4" />
    </>
  ),
  sparkles: <path d="M12 3.5 13.8 9 19.5 11l-5.7 2-1.8 5.5-1.8-5.5L4.5 11l5.7-2L12 3.5ZM19 3v3M17.5 4.5h3" />,
  github: <path d="M9 19.5c-4 1.2-4-2-5.5-2.5m11 4.5v-3.4a3 3 0 0 0-.8-2.3c2.7-.3 5.5-1.3 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6 3.1 5 3.4 5 3.4a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 3.6 9.8c0 4.6 2.8 5.7 5.5 6a3 3 0 0 0-.8 2.3v3.4" />,
  terminal: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="m7 9.5 3 2.5-3 2.5M12.5 15H17" />
    </>
  ),
  device: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2" />
      <path d="M10 5.5h4M11 18.5h2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5Z" />
    </>
  ),
  file: (
    <>
      <path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5l-5-5Z" />
      <path d="M13.5 3.5v5h5" />
    </>
  ),
  package: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </>
  ),
  code: <path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4M13.5 5l-3 14" />,
  activity: <path d="M3.5 12h3.5l2.5-6.5 5 13 2.5-6.5h3.5" />,
  refresh: <path d="M19.5 12a7.5 7.5 0 0 1-13.2 4.9M4.5 12A7.5 7.5 0 0 1 17.7 7.1M18 3.5v4h-4M6 20.5v-4h4" />,
  external: <path d="M14 4.5h5.5V10M19.5 4.5 11 13M17 13.5v5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7h5" />,
  user: (
    <>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  doc: (
    <>
      <path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5l-5-5Z" />
      <path d="M9 12.5h6M9 16h6M9 9h2" />
    </>
  ),
  bolt: <path d="M13 3 5 13.5h6.5L11 21l8-10.5h-6.5L13 3Z" />,
}

function Icon({ name, size = 18, className = '', strokeWidth = 1.8, title }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {PATHS[name] || PATHS.info}
    </svg>
  )
}

export default Icon
