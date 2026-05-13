import React from "react"

interface PanelProps {
  title?: string
  icon?: React.ReactNode
  badge?: string | number
  badgeColor?: string
  accent?: boolean
  className?: string
  children: React.ReactNode
}

export function Panel({
  title,
  icon,
  badge,
  badgeColor = "text-[var(--color-text-muted)]",
  accent = false,
  className = "",
  children,
}: PanelProps) {
  return (
    <div
      className={[
        "panel-accent",
        "relative",
        "bg-[var(--color-bg-panel)]",
        "border border-[var(--color-border-subtle)]",
        accent ? "border-t-2 border-t-[var(--color-border-accent)]" : "",
        "rounded-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {(title || badge !== undefined) && (
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          {title && (
            <div className="flex items-center gap-2">
              {icon && (
                <span className="text-[var(--color-text-dim)] flex-shrink-0">
                  {icon}
                </span>
              )}
              <h3
                className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-primary)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {title}
              </h3>
            </div>
          )}
          {!title && icon && (
            <span className="text-[var(--color-text-dim)]">{icon}</span>
          )}
          {badge !== undefined && (
            <span
              className={`text-xs font-semibold tracking-wide ${badgeColor}`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {badge}
            </span>
          )}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}
