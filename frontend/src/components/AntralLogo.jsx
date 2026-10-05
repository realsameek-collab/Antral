import { useId } from 'react'

const SHIELD = 'M16 2.5 27 6.6V15c0 6.9-4.6 12.1-11 14.5C9.6 27.1 5 21.9 5 15V6.6L16 2.5Z'

// Antral mark: a shield with a neural "A" inside, made of nodes and links.
function AntralLogo({ size = 40, animated = false, className = '' }) {
  const id = useId().replace(/:/g, '')
  const gradId = `antral-grad-${id}`
  const scanId = `antral-scan-${id}`
  const clipId = `antral-clip-${id}`

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      className={`antral-logo ${animated ? 'antral-logo-animated' : ''} ${className}`}
    >
      <defs>
        <linearGradient id={gradId} x1="5" y1="3" x2="27" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c7d2fe" />
          <stop offset="0.5" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id={scanId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#67e8f9" stopOpacity="0" />
          <stop offset="0.5" stopColor="#67e8f9" stopOpacity="0.6" />
          <stop offset="1" stopColor="#67e8f9" stopOpacity="0" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={SHIELD} />
        </clipPath>
      </defs>

      <path
        d={SHIELD}
        pathLength="1"
        fill={`url(#${gradId})`}
        fillOpacity="0.14"
        stroke={`url(#${gradId})`}
        strokeWidth="1.6"
        strokeLinejoin="round"
        className="antral-logo-shield"
      />

      <g stroke={`url(#${gradId})`} strokeWidth="1.6" strokeLinecap="round" className="antral-logo-links">
        <path d="M16 9 11.4 21.5" pathLength="1" />
        <path d="M16 9 20.6 21.5" pathLength="1" />
        <path d="M13.1 16.8h5.8" pathLength="1" />
      </g>

      <g fill="#e0e7ff" className="antral-logo-nodes">
        <circle cx="16" cy="9" r="1.9" />
        <circle cx="11.4" cy="21.5" r="1.5" />
        <circle cx="20.6" cy="21.5" r="1.5" />
      </g>

      {animated && (
        <g clipPath={`url(#${clipId})`}>
          <rect x="4" y="-6" width="24" height="6" fill={`url(#${scanId})`} className="antral-logo-scan" />
        </g>
      )}
    </svg>
  )
}

export default AntralLogo
