"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NOTICE_TONE_CLASS, type NoticeTone } from "@/components/ui/notice-icon"
import { cn } from "@/lib/utils"
import { tramar } from "./dither"
import { DitherText } from "./dither-text"
import { DitherTimer } from "./dither-timer"
import { ToastMark } from "./toast-mark"
import { removeToast, closeToast, type ToastData, type ToastEffect, type ToastId, type ToastKind } from "./toast-store"

const TONE: Record<ToastKind, NoticeTone> = {
  success: "success",
  error: "error",
  warning: "warning",
  info: "info",
  loading: "neutral",
}

/** Lo que tarda la tarjeta en irse (desvanecerse o tramarse) después de disolverse el texto. */
const EXIT_MS = 180
/** Lo que tarda la tarjeta en tramarse al llegar con `materialize`. */
const MATERIALIZE_MS = 260

export interface ToastPlacement {
  /** 0 es el de enfrente. */
  index: number
  y: number
  scale: number
  /** Alto forzado (los de atrás toman el del de enfrente al estar juntos). */
  height?: number
  /** Los de atrás solo asoman el borde: su contenido no se ve. */
  covered: boolean
}

interface ToastCardProps {
  toast: ToastData
  effect: ToastEffect
  placement: ToastPlacement
  paused: boolean
  reducedMotion: boolean
  onHeight: (id: ToastId, height: number) => void
}

export function ToastCard({ toast, effect, placement, paused, reducedMotion, onHeight }: ToastCardProps) {
  const toneClass = NOTICE_TONE_CLASS[TONE[toast.kind]]
  const materialize = effect === "materialize" && !reducedMotion
  const [mounted, setMounted] = useState(false)
  // Con materialize el texto espera a que la tarjeta termine de tramarse.
  const [cardReady, setCardReady] = useState(!materialize)
  // Versión en la que el título terminó de disolverse; una actualización durante la salida la cancela.
  const [hiddenAt, setHiddenAt] = useState<number | null>(null)
  // Si se cierra antes de mostrar su texto, no hay nada que disolver.
  const gone = toast.leaving && (hiddenAt === toast.version || !cardReady)
  const cardRef = useRef<HTMLLIElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  /** Tiempo que le queda a la versión vigente; cada actualización lo reinicia. */
  const remaining = useRef({ version: toast.version, ms: toast.duration })
  /** Desde cuándo corre el tiempo; null en pausa. */
  const corriendoDesde = useRef<number | null>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  // Antes del primer cuadro: la tarjeta no se asoma completa antes de tramarse.
  useLayoutEffect(() => {
    const card = cardRef.current
    if (!materialize || cardReady || !card) return
    return tramar(card, 1, MATERIALIZE_MS, () => setCardReady(true))
  }, [materialize, cardReady])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const observer = new ResizeObserver(() => onHeight(toast.id, el.offsetHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [toast.id, onHeight])

  useEffect(() => {
    const { version, duration } = toast
    if (remaining.current.version !== version) remaining.current = { version, ms: duration }
    if (paused || toast.leaving || !Number.isFinite(duration)) return
    const inicio = Date.now()
    corriendoDesde.current = inicio
    const timer = setTimeout(() => closeToast(toast.id), remaining.current.ms)
    return () => {
      clearTimeout(timer)
      corriendoDesde.current = null
      if (remaining.current.version === version) remaining.current.ms -= Date.now() - inicio
    }
  }, [paused, toast])

  const restante = useCallback(() => {
    if (remaining.current.version !== toast.version) return 1
    const transcurrido = corriendoDesde.current === null ? 0 : Date.now() - corriendoDesde.current
    return Math.max(0, (remaining.current.ms - transcurrido) / toast.duration)
  }, [toast.version, toast.duration])

  // Salida: con materialize la tarjeta se trama hacia afuera; si no, se desvanece.
  useEffect(() => {
    const card = cardRef.current
    if (!gone) return
    if (materialize && card) return tramar(card, 0, EXIT_MS, () => removeToast(toast.id))
    const timer = setTimeout(() => removeToast(toast.id), reducedMotion ? 0 : EXIT_MS)
    return () => clearTimeout(timer)
  }, [gone, materialize, reducedMotion, toast.id])

  // Con materialize la tarjeta entra y sale por tramado; si no, por transparencia.
  const visible = placement.index < 3 && (materialize || (mounted && !gone))
  const textVisible = cardReady && !toast.leaving
  const style: CSSProperties = {
    zIndex: 10 - placement.index,
    height: placement.height,
    opacity: visible ? 1 : 0,
    transform: materialize || mounted ? `translateY(${placement.y}px) scale(${placement.scale})` : "translateY(-50%) scale(0.96)",
    transition: reducedMotion ? "none" : undefined,
  }

  return (
    <li
      ref={cardRef}
      role={toast.kind === "error" ? "alert" : "status"}
      aria-atomic="true"
      style={style}
      className={cn(
        "group pointer-events-auto absolute inset-x-0 top-0 box-content origin-bottom overflow-hidden rounded-(--notice-radius) border bg-card text-card-foreground shadow-(--floating-shadow)",
        "transition-[transform,height,opacity] duration-(--motion-layout-duration) ease-(--motion-ease-out)",
        // Al ancho de su texto hasta --notice-width; en celular, a lo ancho para no apretar el texto.
        "sm:mx-auto sm:w-max sm:max-w-(--notice-width)",
        // Puente entre toasts separados: el puntero no sale de la pila al pasar de uno a otro.
        "after:absolute after:inset-x-0 after:top-full after:h-2",
        !visible && "pointer-events-none",
      )}
    >
      <div
        ref={contentRef}
        className={cn("flex gap-3 px-4 py-3 transition-opacity duration-150", placement.covered && "opacity-0")}
      >
        {/* Alto de una línea del título: la marca queda centrada en la primera línea. */}
        <span className="flex h-[1lh] items-center text-label-sm">
          <ToastMark toneClass={toneClass} loading={toast.kind === "loading"} reducedMotion={reducedMotion} />
        </span>
        {/* Máximo dos líneas: el título solo, o una de título y una de descripción. */}
        <div className="min-w-0 flex-1 pr-6">
          <DitherText
            text={toast.title}
            visible={textVisible}
            reducedMotion={reducedMotion}
            toneClass={toneClass}
            className="text-label-sm text-foreground"
            textClassName={cn("[overflow-wrap:anywhere]", toast.description ? "line-clamp-1" : "line-clamp-2")}
            onHidden={() => setHiddenAt(toast.version)}
          />
          {/* Solo el título lleva el efecto; la descripción aparece suave cuando el título ya se ve. */}
          {toast.description && textVisible && (
            <p key={toast.description} className="toast-text-enter mt-0.5 line-clamp-1 text-body-sm text-muted-foreground [overflow-wrap:anywhere]">
              {toast.description}
            </p>
          )}
          {toast.action && (
            <Button type="button" variant="outline" size="xs" className="mt-2" onClick={() => { toast.action?.onClick(); closeToast(toast.id) }}>
              {toast.action.label}
            </Button>
          )}
        </div>
      </div>
      {/* La X aparece al pasar el puntero o con el teclado; en pantallas táctiles siempre se ve. */}
      <Button
        type="button"
        variant="ghost"
        size="xs"
        aria-label="Cerrar notificación"
        onClick={() => closeToast(toast.id)}
        className={cn(
          "absolute right-2 top-2 size-7 px-0 text-muted-foreground opacity-0 transition-opacity",
          "group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
          placement.covered && "invisible",
        )}
      >
        <X aria-hidden="true" />
      </Button>
      {/* Solo con `timer`: sin tiempo (se queda hasta cerrarse) o con movimiento reducido, no hay barra. */}
      {effect === "timer" && Number.isFinite(toast.duration) && !reducedMotion && !toast.leaving && (
        <DitherTimer key={toast.version} restante={restante} running={!paused} toneClass={toneClass} />
      )}
    </li>
  )
}
