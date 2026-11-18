"use client"

import { useEffect, useState } from "react"
import { CalendarDays, Clock3 } from "lucide-react"

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
})

const shortDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
})

const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
})

export function WorkspaceClock({ isCompact = false }: { isCompact?: boolean }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const interval = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  if (!now) return null

  const date = dateFormatter.format(now)
  const time = timeFormatter.format(now)

  return (
    <time
      dateTime={now.toISOString()}
      aria-label={`${date}, ${time}`}
      className={`flex shrink-0 items-center text-body-sm text-muted-foreground ${isCompact ? "gap-1" : "gap-2 md:gap-4"}`}
    >
      {isCompact ? (
        <>
          <span>{shortDateFormatter.format(now)}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{time}</span>
        </>
      ) : (
        <>
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="hidden size-4 md:block" aria-hidden="true" />
            <span className="md:hidden">{shortDateFormatter.format(now)}</span>
            <span className="hidden capitalize md:inline">{date}</span>
          </span>
          <span className="inline-flex items-center gap-2 tabular-nums">
            <Clock3 className="size-4" aria-hidden="true" />
            {time}
          </span>
        </>
      )}
    </time>
  )
}
