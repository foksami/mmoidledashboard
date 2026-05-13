import React from "react"

type Quality = "STANDARD" | "PREMIUM" | "RARE" | "EPIC" | "LEGENDARY"

interface QualityBadgeProps {
  name: string
  quality: Quality
  className?: string
}

const qualityColorVar: Record<Quality, string> = {
  STANDARD: "var(--color-q-common)",
  PREMIUM: "var(--color-q-uncommon)",
  RARE: "var(--color-q-rare)",
  EPIC: "var(--color-q-epic)",
  LEGENDARY: "var(--color-q-legendary)",
}

export function QualityBadge({
  name,
  quality,
  className = "",
}: QualityBadgeProps) {
  const color = qualityColorVar[quality]

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm ${className}`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      <span
        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span style={{ color }}>{name}</span>
    </span>
  )
}
