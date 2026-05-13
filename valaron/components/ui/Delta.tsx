import React from "react"

interface DeltaProps {
  value: number
  suffix?: string
  className?: string
}

function formatNumber(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) {
    return (abs / 1_000_000).toFixed(1) + "M"
  }
  if (abs >= 1_000) {
    return (abs / 1_000).toFixed(1) + "k"
  }
  return abs.toString()
}

export function Delta({ value, suffix = "", className = "" }: DeltaProps) {
  if (value === 0) {
    return (
      <span
        className={`text-[var(--color-text-muted)] ${className}`}
        style={{ fontFamily: "var(--font-mono)" }}
      >
        —
      </span>
    )
  }

  const isPositive = value > 0
  const color = isPositive
    ? "text-[var(--color-green)]"
    : "text-[var(--color-red)]"
  const arrow = isPositive ? "▲" : "▼"

  return (
    <span
      className={`${color} ${className}`}
      style={{ fontFamily: "var(--font-mono)" }}
    >
      {arrow}
      {formatNumber(value)}
      {suffix}
    </span>
  )
}
