"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Contenedor cuyo alto sigue al de su contenido con una transición suave (globals.css,
 * `.auto-height`): al cambiar de paso en un asistente, el modal crece o se encoge en lugar
 * de saltar. El primer alto se toma sin animar. Deja 4px de margen interno para que los
 * anillos de foco de los campos no se recorten.
 */
export function AutoHeight({ children, className }: {
  children: ReactNode
  /** Disposición del contenido (p. ej. "grid gap-5"). */
  className?: string
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>()

  useLayoutEffect(() => {
    const inner = innerRef.current
    if (!inner) return
    const observer = new ResizeObserver(() => setHeight(inner.offsetHeight))
    observer.observe(inner)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="auto-height -m-1 overflow-hidden" style={{ height }}>
      <div ref={innerRef} className={cn("p-1", className)}>{children}</div>
    </div>
  )
}
