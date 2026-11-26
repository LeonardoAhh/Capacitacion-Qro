"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface TruncatedTextProps {
  children: string
  /** Se invoca solo cuando el texto no cabe en las líneas visibles. */
  onExpand: () => void
  /** Nombre accesible del botón, p. ej. "Ver motivo completo". */
  expandLabel: string
  /** Líneas visibles antes de recortar (por defecto 3). */
  lines?: 2 | 3
  className?: string
}

// Clases estáticas para que Tailwind las genere.
const LINE_CLAMP = { 2: "line-clamp-2", 3: "line-clamp-3" } as const

/**
 * Texto recortado a `lines` líneas. Si no cabe, se vuelve un botón que abre
 * el contenido completo; si cabe, se queda como texto plano.
 */
export function TruncatedText({ children, onExpand, expandLabel, lines = 3, className }: TruncatedTextProps) {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const [truncated, setTruncated] = useState(false)
  const ref = useCallback((element: HTMLElement | null) => setNode(element), [])

  useEffect(() => {
    if (!node) return
    const measure = () => setTruncated(node.scrollHeight > node.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [node, children])

  // `relative` contiene el texto sr-only (absoluto) dentro del recorte; sin él desborda el contenedor con scroll.
  const base = cn("relative break-words text-left", LINE_CLAMP[lines], className)

  if (!truncated) return <p ref={ref} className={base}>{children}</p>

  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="dialog"
      title={expandLabel}
      onClick={onExpand}
      className={cn(
        base,
        "w-full cursor-pointer rounded-sm decoration-muted-foreground/60 underline-offset-4 hover:underline",
        "",
      )}
    >
      {children}
      <span className="sr-only">. {expandLabel}</span>
    </button>
  )
}
