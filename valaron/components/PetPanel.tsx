import React from "react"

interface Pet {
  name: string
  level: number
  imageUrl: string | null
}

interface PetPanelProps {
  pet: Pet | null
}

export function PetPanel({ pet }: PetPanelProps) {
  if (!pet) {
    return <p className="text-sm text-[var(--color-text-muted)]">No pet equipped.</p>
  }

  return (
    <div className="flex items-center gap-3">
      {pet.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pet.imageUrl}
          alt={pet.name}
          className="w-10 h-10 rounded object-contain bg-[var(--color-bg-inner)] flex-shrink-0"
        />
      )}
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-[var(--color-text-primary)]">{pet.name}</span>
        <span className="text-xs text-[var(--color-text-muted)]" style={{ fontFamily: "var(--font-mono)" }}>
          Level {pet.level}
        </span>
      </div>
    </div>
  )
}
