interface ClaimLedgerLogoProps {
  /** Size in pixels (width and height). Defaults to 36. */
  size?: number
  /** Additional CSS class names. */
  className?: string
  /** Whether to render the standalone monogram or include the "ClaimLedger" wordmark. */
  withWordmark?: boolean
  /** Wordmark text color variant. */
  wordmarkColor?: 'dark' | 'light'
}

/**
 * Official ClaimLedger Monogram & Brand Logo
 * Features the signature outer 'C' (Claim/Compliance) embracing the inner 'L' (Ledger/Legal),
 * rendered in brand teal and mint gradients with crisp geometric precision.
 */
export function ClaimLedgerLogo({
  size = 36,
  className = '',
  withWordmark = false,
  wordmarkColor = 'dark',
}: ClaimLedgerLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
        aria-label="ClaimLedger logo"
      >
        <defs>
          {/* Background Squircle Gradient */}
          <linearGradient id="cl-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0F766E" />
            <stop offset="100%" stopColor="#093E3A" />
          </linearGradient>

          {/* Outer 'C' Brand Gradient (Teal to Mint) */}
          <linearGradient id="cl-c-grad" x1="15%" y1="15%" x2="85%" y2="85%">
            <stop offset="0%" stopColor="#2DD4BF" />
            <stop offset="50%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>

          {/* Inner 'L' Highlight Gradient */}
          <linearGradient id="cl-l-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E6FFFA" />
          </linearGradient>

          {/* Subtle Outer Glow Filter */}
          <filter id="cl-shadow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#04201E" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Squircle Container */}
        <rect
          x="4"
          y="4"
          width="92"
          height="92"
          rx="22"
          fill="url(#cl-bg-grad)"
          stroke="#14B8A6"
          strokeOpacity="0.25"
          strokeWidth="1.5"
        />

        {/* Outer Monogram 'C' (Sweeping Arc) */}
        <path
          d="M 68 30 C 58 18 40 18 29 28 C 17 39 17 61 29 72 C 40 82 58 82 68 70"
          stroke="url(#cl-c-grad)"
          strokeWidth="10"
          strokeLinecap="round"
          filter="url(#cl-shadow)"
        />

        {/* Inner Monogram 'L' (Architectural Ledger / Check Vertex) */}
        <path
          d="M 42 36 L 42 63 L 64 63"
          stroke="url(#cl-l-grad)"
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#cl-shadow)"
        />

        {/* Subtle Anchor Dot on the Ledger Horizontal Terminal */}
        <circle cx="64" cy="63" r="1.5" fill="#2DD4BF" />
      </svg>

      {withWordmark && (
        <span
          className={`font-display text-xl font-bold tracking-tight ${
            wordmarkColor === 'light' ? 'text-white' : 'text-[#0A1F36]'
          }`}
        >
          ClaimLedger
        </span>
      )}
    </div>
  )
}
