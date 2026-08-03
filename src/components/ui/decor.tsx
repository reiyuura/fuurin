/** Shared decorative SVG assets: wind chime, petals, Fuji + torii scene. */

export function Fuurin({ className = '', label }: { className?: string; label?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`} aria-hidden="true">
      <div className="h-6 w-px bg-border" />
      <div className="relative">
        <div className="size-9 rounded-full border-[3px] border-border bg-card shadow-[0_4px_14px_rgba(200,124,141,0.18)] backdrop-blur-sm" />
        <div className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
      </div>
      <div className="h-3 w-px bg-border" />
      {label && (
        <div className="mt-0.5 flex min-h-14 w-8 items-center justify-center rounded-b-2xl bg-card px-1 py-1.5 shadow-sm">
          <span className="font-jp text-[7px] leading-tight tracking-wide text-muted-foreground [writing-mode:vertical-rl]">
            {label}
          </span>
        </div>
      )}
    </div>
  )
}

export function Petal({ className = '', size = 8 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 0C8 3 12 4 12 7a5 5 0 0 1-6 5 5 5 0 0 1-6-5c0-3 4-4 6-7Z" fill="currentColor" />
    </svg>
  )
}

export function Blossom({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse key={deg} cx="12" cy="6.5" rx="3.1" ry="4.6" fill="currentColor" transform={`rotate(${deg} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="1.7" fill="currentColor" opacity="0.85" />
    </svg>
  )
}

/** Faint Mt. Fuji + torii + sakura scene, used as a watermark. */
export function FujiScene({ className = '' }: { className?: string }) {
  // `meet`, not `slice`: in a wide short footer band `slice` crops to the mountain's
  // flat base and reads as a stray pale rectangle instead of a Fuji silhouette.
  return (
    <svg viewBox="0 0 400 160" className={className} aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMax meet">
      <path d="M0 160 L120 54 L160 92 L188 70 L300 160Z" fill="currentColor" opacity=".18" />
      {/* Snow cap tints with the parent colour; a hard #fff read as a stray pale panel on washi. */}
      <path d="M120 54 L146 78 L134 82 L128 74 L118 84 L104 72Z" fill="currentColor" opacity=".09" />
      <g fill="currentColor" opacity=".24">
        <rect x="252" y="96" width="6" height="64" rx="2" />
        <rect x="318" y="96" width="6" height="64" rx="2" />
        <rect x="240" y="88" width="96" height="7" rx="3" />
        <rect x="246" y="104" width="84" height="6" rx="3" />
      </g>
      <g fill="currentColor" opacity=".20">
        <circle cx="46" cy="40" r="9" />
        <circle cx="64" cy="30" r="7" />
        <circle cx="30" cy="28" r="6" />
        <rect x="44" y="44" width="3" height="46" rx="1.5" />
      </g>
    </svg>
  )
}
