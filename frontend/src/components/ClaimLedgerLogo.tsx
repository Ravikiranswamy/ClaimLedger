import markImg from '../assets/claimledger-mark.png'

interface ClaimLedgerLogoProps {
  /** Size in pixels (width and height). Defaults to 38. */
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
 * Retains the signature C+L monogram mark from assets.
 */
export function ClaimLedgerLogo({
  size = 38,
  className = '',
  withWordmark = false,
  wordmarkColor = 'dark',
}: ClaimLedgerLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src={markImg}
        alt="ClaimLedger"
        width={size}
        height={size}
        style={{ width: `${size}px`, height: `${size}px` }}
        className="shrink-0 object-contain rounded-xl transition-transform duration-200 hover:scale-105"
      />

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
