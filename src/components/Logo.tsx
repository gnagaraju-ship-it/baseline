/**
 * The Baseline mark: lines of text resting on an orange baseline, on a dark tile that stays dark in both themes.
 * The same drawing is public/favicon.svg.
 */
export function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Baseline" className={`flex-none ${className}`}>
      <rect width="32" height="32" rx="8" fill="#18181B" />
      <rect x="8" y="7" width="12" height="3" rx="1.5" fill="#FAFAFA" />
      <rect x="8" y="13" width="16" height="3" rx="1.5" fill="#A1A1AA" />
      <rect x="8" y="19" width="9" height="3" rx="1.5" fill="#A1A1AA" />
      <rect x="6" y="24.5" width="20" height="2.5" rx="1.25" fill="#FF5A1F" />
    </svg>
  )
}
