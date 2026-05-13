"use client"

import React, { useMemo } from "react"
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

interface MiniSparklineProps {
  data: number[]
  color?: string
  height?: number
  className?: string
}

export function MiniSparkline({
  data,
  color = "#f0c14a",
  height = 32,
  className = "",
}: MiniSparklineProps) {
  const chartData = useMemo(
    () => data.map((value, index) => ({ index, value })),
    [data]
  )

  const gradientId = useMemo(
    () => `sparkline-gradient-${Math.random().toString(36).slice(2, 8)}`,
    []
  )

  if (data.length === 0) return null

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            content={() => null}
            cursor={false}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
