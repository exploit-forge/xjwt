const ARC = 'M19.8 4.6A30 30 0 0 1 44.2 4.6L42.6 8.4A26 26 0 0 0 21.4 8.4Z'

function XJwtLogo({ className = 'h-10 w-10' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="XJWT logo">
      <g fill="currentColor">
        <path d={ARC} />
        <path d={ARC} transform="rotate(90 32 32)" />
        <path d={ARC} transform="rotate(180 32 32)" />
        <path d={ARC} transform="rotate(270 32 32)" />
      </g>
      <path d="M20 20l24 24M44 20L20 44" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default XJwtLogo
