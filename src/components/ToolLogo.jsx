function initials(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  if (words.length === 1) return words[0].slice(0, 2)
  return `${words[0][0]}${words[1][0]}`
}

export default function ToolLogo({ iconKey = 'other', name = '', className = '' }) {
  const key = String(iconKey || 'other').toLowerCase()
  const label = name || key

  if (key === 'photoshop') {
    return (
      <svg className={`tool-logo ${className}`} viewBox="0 0 48 48" role="img" aria-label={`${label} logo`}>
        <rect width="48" height="48" rx="10" fill="#001E36" />
        <text x="8.5" y="32" fill="#31A8FF" fontSize="22" fontFamily="Arial, sans-serif" fontWeight="700">Ps</text>
      </svg>
    )
  }

  if (key === 'illustrator') {
    return (
      <svg className={`tool-logo ${className}`} viewBox="0 0 48 48" role="img" aria-label={`${label} logo`}>
        <rect width="48" height="48" rx="10" fill="#330000" />
        <text x="10" y="32" fill="#FF9A00" fontSize="22" fontFamily="Arial, sans-serif" fontWeight="700">Ai</text>
      </svg>
    )
  }

  if (key === 'lightroom') {
    return (
      <svg className={`tool-logo ${className}`} viewBox="0 0 48 48" role="img" aria-label={`${label} logo`}>
        <rect width="48" height="48" rx="10" fill="#001E36" />
        <text x="10" y="32" fill="#31A8FF" fontSize="22" fontFamily="Arial, sans-serif" fontWeight="700">Lr</text>
      </svg>
    )
  }

  if (key === 'premiere') {
    return (
      <svg className={`tool-logo ${className}`} viewBox="0 0 48 48" role="img" aria-label={`${label} logo`}>
        <rect width="48" height="48" rx="10" fill="#00005B" />
        <text x="8.5" y="32" fill="#9999FF" fontSize="22" fontFamily="Arial, sans-serif" fontWeight="700">Pr</text>
      </svg>
    )
  }

  if (key === 'aftereffects') {
    return (
      <svg className={`tool-logo ${className}`} viewBox="0 0 48 48" role="img" aria-label={`${label} logo`}>
        <rect width="48" height="48" rx="10" fill="#00005B" />
        <text x="8.5" y="32" fill="#9999FF" fontSize="22" fontFamily="Arial, sans-serif" fontWeight="700">Ae</text>
      </svg>
    )
  }

  if (key === 'indesign') {
    return (
      <svg className={`tool-logo ${className}`} viewBox="0 0 48 48" role="img" aria-label={`${label} logo`}>
        <rect width="48" height="48" rx="10" fill="#49021F" />
        <text x="10" y="32" fill="#FF3366" fontSize="22" fontFamily="Arial, sans-serif" fontWeight="700">Id</text>
      </svg>
    )
  }

  if (key === 'figma') {
    return (
      <svg className={`tool-logo ${className}`} viewBox="0 0 48 48" role="img" aria-label={`${label} logo`}>
        <rect width="48" height="48" rx="10" fill="#fff" />
        <rect x="13" y="7" width="11" height="11" rx="5.5" fill="#F24E1E" />
        <rect x="24" y="7" width="11" height="11" rx="5.5" fill="#FF7262" />
        <rect x="13" y="18" width="11" height="11" rx="5.5" fill="#A259FF" />
        <circle cx="29.5" cy="23.5" r="5.5" fill="#1ABCFE" />
        <rect x="13" y="29" width="11" height="11" rx="5.5" fill="#0ACF83" />
      </svg>
    )
  }

if (key === 'canva') {
  return (
    <svg
      className={`tool-logo ${className}`}
      viewBox="0 0 48 48"
      role="img"
      aria-label={`${label} logo`}
    >
      <defs>
        <linearGradient
          id="canvaGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#00C4CC" />
          <stop offset="35%" stopColor="#12B7D7" />
          <stop offset="65%" stopColor="#4F6FEF" />
          <stop offset="100%" stopColor="#7D2AE8" />
        </linearGradient>
      </defs>

      <circle
        cx="24"
        cy="24"
        r="22"
        fill="url(#canvaGradient)"
      />

      <text
        x="14"
        y="32"
        fill="#FFFFFF"
        fontSize="24"
        fontFamily="Georgia, serif"
        fontStyle="italic"
        fontWeight="700"
      >
        C
      </text>
    </svg>
  )
}

  if (key === 'vscode') {
    return (
      <svg className={`tool-logo ${className}`} viewBox="0 0 48 48" role="img" aria-label={`${label} logo`}>
        <rect width="48" height="48" rx="10" fill="#F8FBFF" />
        <path d="M34.8 7.5 19.7 21.2l-7.1-5.6-4.1 3.3 8.1 7.1-8.1 7.1 4.1 3.3 7.1-5.6 15.1 13.7 5.7-2.8V10.3l-5.7-2.8Zm0 10.4v16.2L24.5 26l10.3-8.1Z" fill="#007ACC" />
      </svg>
    )
  }

  return (
    <span className={`tool-logo tool-logo-generic ${className}`} role="img" aria-label={`${label} mark`}>
      {initials(label)}
    </span>
  )
}
