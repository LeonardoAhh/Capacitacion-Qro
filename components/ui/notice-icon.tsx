"use client"

import { useEffect, useState } from "react"
import { Circle, type IconNode } from "lucide"
import { MorphIcon } from "morphicons/react"
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
  /** Ícono de `lucide` (datos, no el componente de lucide-react). */
  icon: IconNode
  tone?: NoticeTone
  /** Giro continuo (estado de carga). */
  spin?: boolean
}

/**
 * Ícono de avisos (toast y actualización), solo con el color del aviso. Al
 * aparecer se transforma desde un círculo y al cambiar de ícono, de uno a otro
 * (morphicons); con movimiento reducido el cambio es inmediato.
 */
export function NoticeIcon({ icon, tone = "neutral", spin = false }: NoticeIconProps) {
  const [current, setCurrent] = useState<IconNode>(Circle)
  useEffect(() => { setCurrent(icon) }, [icon])

  return (
    <span className={cn("flex shrink-0", TONE_CLASS[tone])} aria-hidden="true">
      <MorphIcon icon={current} size={20} strokeWidth={2} spring="snappy" reducedMotion="user"
        className={cn(spin && "animate-spin motion-reduce:animate-none")} />
    </span>
  )
}
