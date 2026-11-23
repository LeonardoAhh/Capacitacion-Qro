"use client"

import { useEffect, useState } from "react"

const shortDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
})

const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
})

export function WorkspaceClock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const interval = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  if (!now) return null

  const time = timeFormatter.format(now)
  const date = shortDateFormatter.format(now)

  return (
    <time
      dateTime={now.toISOString()}
      aria-label={`${date}, ${time}`}
      className="flex shrink-0 items-center gap-2 text-body-sm text-muted-foreground"
    >
      <span>{shortDateFormatter.format(now)}</span>
      <span aria-hidden="true">·</span>
      <span className="tabular-nums">{time}</span>
    </time>
  )
}
