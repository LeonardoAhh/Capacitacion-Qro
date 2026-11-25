"use client"

import { useEffect, useState } from "react"
import { Circle, type IconNode } from "lucide"
import { MorphIcon } from "morphicons/react"
import { useAppReducedMotion } from "@/components/app-transition"
import { cn } from "@/lib/utils"

export type NoticeTone = "neutral" | "success" | "error" | "warning" | "info"

const TONE_CLASS: Record<NoticeTone, string> = {
  neutral: "text-primary",
  success: "text-success",
  error: "text-destructive",
  warning: "text-warning-deep",
  info: "text-info",
}

interface NoticeIconProps {
  /** Datos de ícono de `lucide` (no el componente de `lucide-react`). */
  icon: IconNode
  tone?: NoticeTone
  spin?: boolean
}

export function NoticeIcon({ icon, tone = "neutral", spin = false }: NoticeIconProps) {
  const reducedMotion = useAppReducedMotion()
  const [current, setCurrent] = useState<IconNode>(Circle)
  useEffect(() => { setCurrent(icon) }, [icon])

  return (
    <span className={cn("flex shrink-0", TONE_CLASS[tone])} aria-hidden="true">
      <MorphIcon
        icon={reducedMotion ? icon : current}
        size={20}
        strokeWidth={2}
        spring="snappy"
        reducedMotion={reducedMotion ? "always" : "user"}
        className={cn(spin && !reducedMotion && "animate-spin motion-reduce:animate-none")}
      />
    </span>
  )
}
