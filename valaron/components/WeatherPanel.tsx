import React from "react"
import { fmtTime } from "@/lib/fmt"

interface ActiveWeather {
  name: string
  buffs: string[]
  endsAt: string
}

interface WeatherPanelProps {
  weather: ActiveWeather | null
  locationName: string | null | undefined
}

function weatherIcon(name: string): string {
  const n = name.toLowerCase()
  if (n.includes("rain")) return "🌧"
  if (n.includes("storm") || n.includes("thunder")) return "⛈"
  if (n.includes("snow") || n.includes("blizzard")) return "❄"
  if (n.includes("wind")) return "💨"
  if (n.includes("fog") || n.includes("mist")) return "🌫"
  if (n.includes("sun") || n.includes("clear")) return "☀"
  if (n.includes("cloud")) return "☁"
  if (n.includes("hail")) return "🌨"
  return "🌤"
}

function buffColor(buff: string): string {
  const first = buff.trim()[0]
  if (first === "+") return "text-[var(--color-green)]"
  if (first === "-") return "text-[var(--color-red)]"
  return "text-[var(--color-text-secondary)]"
}

function formatTime(iso: string): string {
  return fmtTime(iso)
}

export function WeatherPanel({ weather, locationName }: WeatherPanelProps) {
  if (!weather) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        No weather data{locationName ? ` for ${locationName}` : ""}.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Weather name + end time */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{weatherIcon(weather.name)}</span>
          <span
            className="text-sm text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {weather.name}
          </span>
        </div>
        <span
          className="text-[10px] text-[var(--color-text-muted)]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          until {formatTime(weather.endsAt)}
        </span>
      </div>

      {/* Buffs */}
      {weather.buffs.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {weather.buffs.map((buff, i) => (
            <span key={i} className={`text-xs ${buffColor(buff)}`}>
              {buff}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
