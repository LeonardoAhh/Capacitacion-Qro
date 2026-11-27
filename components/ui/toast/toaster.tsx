"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useAppReducedMotion } from "@/components/app-transition"
import { ToastCard, type ToastPlacement } from "./toast-card"
import { getServerToasts, getToasts, subscribeToasts, type ToastEffect, type ToastId } from "./toast-store"

/** Lo que asoma cada toast de atrás con la pila junta, y la separación al abrirla. */
const PEEK = 8
const GAP = 8
const SCALE_STEP = 0.05

/**
 * Pila de toasts arriba al centro (en celular, a lo ancho). Junta muestra el más reciente con
 * los demás asomando; con el puntero o el foco encima se abre en lista y pausa los tiempos.
 * F6 lleva el foco a la pila. `effect` es el de todos; un toast puede pedir otro.
 */
export function Toaster({ effect = "materialize" }: { effect?: ToastEffect }) {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getServerToasts)
  const reducedMotion = useAppReducedMotion()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pageHidden, setPageHidden] = useState(false)
  const [heights, setHeights] = useState<Record<string, number>>({})
  const listRef = useRef<HTMLOListElement>(null)

  const onHeight = useCallback((id: ToastId, height: number) => {
    setHeights(current => current[id] === height ? current : { ...current, [id]: height })
  }, [])

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "F6" && getToasts().length) {
        event.preventDefault()
        listRef.current?.focus()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("keydown", onKey)
    }
  }, [])

  // Si el último se va con el puntero encima, la pila no se queda abierta para el siguiente.
  const [count, setCount] = useState(toasts.length)
  if (count !== toasts.length) {
    setCount(toasts.length)
    if (!toasts.length) {
      setHovered(false)
      setFocused(false)
    }
  }

  const expanded = hovered || focused
  const front = [...toasts].reverse()
  const frontHeight = front[0] ? heights[front[0].id] : undefined
  const placements = front.map((toast, index): ToastPlacement => {
    const height = heights[toast.id]
    if (!expanded) {
      return { index, y: index * PEEK, scale: 1 - index * SCALE_STEP, height: index ? frontHeight : height, covered: index > 0 }
    }
    const y = front.slice(0, index).reduce((total, newer) => total + (heights[newer.id] ?? 0) + GAP, 0)
    return { index, y, scale: 1, height, covered: false }
  })

  return (
    <ol
      ref={listRef}
      tabIndex={-1}
      aria-label="Notificaciones"
      aria-live="polite"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}
      className="pointer-events-none fixed inset-x-(--notice-edge) top-[calc(env(safe-area-inset-top,0px)+var(--notice-edge))] z-[100]"
    >
      {front.map((toast, index) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          effect={toast.effect ?? effect}
          placement={placements[index]}
          paused={expanded || pageHidden}
          reducedMotion={reducedMotion}
          onHeight={onHeight}
        />
      ))}
    </ol>
  )
}
