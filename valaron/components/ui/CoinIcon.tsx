import React from "react"

/**
 * Tibia-style tiered coin icon based on amount:
 *  < 1 000       → gold coin   (yellow)
 *  1 000–99 999  → platinum    (silver)
 *  100 000+      → crystal     (blue/cyan)
 */
export function CoinIcon({ amount, size = 11 }: { amount: number; size?: number }) {
  const s = size
  const c = s / 2

  if (amount >= 100_000) {
    // Crystal coin — blue diamond
    return (
      <svg width={s} height={s} viewBox="0 0 12 12" style={{ display: "inline-block", flexShrink: 0 }}>
        <defs>
          <linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a0f0ff" />
            <stop offset="100%" stopColor="#2299cc" />
          </linearGradient>
        </defs>
        {/* diamond shape */}
        <polygon points="6,1 11,5.5 6,11 1,5.5" fill="url(#cg)" stroke="#1a7aaa" strokeWidth="0.6" />
        {/* highlight */}
        <polygon points="6,1 11,5.5 6,5.5" fill="white" opacity="0.25" />
      </svg>
    )
  }

  if (amount >= 1_000) {
    // Platinum coin — silver circle
    return (
      <svg width={s} height={s} viewBox="0 0 12 12" style={{ display: "inline-block", flexShrink: 0 }}>
        <defs>
          <radialGradient id="pg" cx="38%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#eeeeee" />
            <stop offset="60%" stopColor="#aaaaaa" />
            <stop offset="100%" stopColor="#777777" />
          </radialGradient>
        </defs>
        <circle cx="6" cy="6" r="5.2" fill="url(#pg)" stroke="#666" strokeWidth="0.5" />
        {/* rim sheen */}
        <ellipse cx="4.5" cy="4" rx="1.8" ry="1" fill="white" opacity="0.3" />
      </svg>
    )
  }

  // Gold coin — classic yellow
  return (
    <svg width={s} height={s} viewBox="0 0 12 12" style={{ display: "inline-block", flexShrink: 0 }}>
      <defs>
        <radialGradient id="gg" cx="38%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ffe066" />
          <stop offset="60%" stopColor="#f0c14a" />
          <stop offset="100%" stopColor="#b8860b" />
        </radialGradient>
      </defs>
      <circle cx="6" cy="6" r="5.2" fill="url(#gg)" stroke="#9a6e00" strokeWidth="0.5" />
      {/* rim sheen */}
      <ellipse cx="4.5" cy="4" rx="1.8" ry="1" fill="white" opacity="0.3" />
    </svg>
  )
}
