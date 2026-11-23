"use client"

import { useEffect, useState } from "react"
import { Circle, type IconNode } from "lucide"
import { MorphIcon } from "morphicons/react"
import { cn } from "@/lib/utils"

export type NoticeTone = "neutral" | "success" | "error" | "warning" | "info"

const TONE_CLASS: Record<NoticeTone, string> = {
  neutral: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  error: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning-foreground",
  info: "bg-info/10 text-info",
}

interface NoticeIconProps {
  /** Ícono de `lucide` (datos, no el componente de lucide-react). */
  icon: IconNode
  tone?: NoticeTone
  /** Giro continuo (estado de carga). */
  spin?: boolean
}

/**
 * Ícono de avisos (toast y actualización): mosaico con el tono del aviso. Al
 * aparecer se transforma desde un círculo y al cambiar de ícono, de uno a otro
 * (morphicons); con movimiento reducido el cambio es inmediato.
 */
export function NoticeIcon({ icon, tone = "neutral", spin = false }: NoticeIconProps) {
  const [current, setCurrent] = useState<IconNode>(Circle)
  useEffect(() => { setCurrent(icon) }, [icon])

  return (
    <span className={cn("grid size-8 shrink-0 place-items-center rounded-md", TONE_CLASS[tone])} aria-hidden="true">
      <MorphIcon icon={current} size={16} strokeWidth={2} spring="snappy" reducedMotion="user"
        className={cn(spin && "animate-spin motion-reduce:animate-none")} />
    </span>
  )
}
