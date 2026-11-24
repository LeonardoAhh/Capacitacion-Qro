"use client"

import { useEffect, useState } from "react"
import { Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GUIDE_COPY, GUIDE_STEPS } from "@/components/content/desempeno/guide-steps"
import { useEvaluationReducedMotion } from "@/components/content/desempeno/use-evaluation-motion"
import { cn } from "@/lib/utils"
import { EYEBROW, PREVIEW_BODY, stepNumber, stepPreview } from "./step-preview"

/** Tiempo que se muestra cada paso antes de avanzar solo. */
const STEP_DURATION_MS = 4500
const PREVIEWS = GUIDE_STEPS.map(step => ({ ...step, preview: stepPreview(step.id) }))

/**
 * Portada: recorre los pasos de la evaluación en una ventana de referencia.
 * Avanza sola, se detiene al pasar el cursor o enfocar, con el botón de pausa o al
 * elegir un paso; sin avance automático si se pidió reducir el movimiento.
 */
export function HeroPreview() {
  const reducedMotion = useEvaluationReducedMotion()
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [hovered, setHovered] = useState(false)
  const autoplay = playing && !hovered && !reducedMotion

  useEffect(() => {
    if (!autoplay) return
    const timer = window.setTimeout(() => setIndex(current => (current + 1) % PREVIEWS.length), STEP_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [autoplay, index])

  const current = PREVIEWS[index]

  return (
    <section
      aria-label={GUIDE_COPY.preview}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
      className="w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="flex items-center gap-1 border-b border-border px-2">
        <ol className="flex min-w-0 flex-1" aria-label={GUIDE_COPY.navigation}>
          {PREVIEWS.map((step, stepIndex) => {
            const active = stepIndex === index
            return (
              <li key={step.id} className="min-w-0 flex-1">
                <button type="button" aria-current={active ? "step" : undefined}
                  onClick={() => { setIndex(stepIndex); setPlaying(false) }}
                  className={cn("relative flex h-(--control-height) w-full min-w-0 items-center justify-center gap-1.5 px-2 text-body-sm transition-colors",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  <span className={cn("text-label-sm tabular-nums", active && "text-primary")}>{stepNumber(stepIndex)}</span>
                  <span className="hidden truncate md:inline">{step.label}</span>
                  {/* Barra del paso activo: se llena mientras corre el tiempo del paso. */}
                  {active && (
                    <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-0.5 overflow-hidden rounded-full bg-primary/20">
                      <span key={`${index}-${autoplay}`}
                        className={cn("block h-full origin-left bg-primary", autoplay && "guide-progress")}
                        style={autoplay ? { animationDuration: `${STEP_DURATION_MS}ms` } : undefined} />
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
        {!reducedMotion && (
          <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground"
            aria-label={playing ? "Pausar recorrido" : "Reanudar recorrido"} onClick={() => setPlaying(value => !value)}>
            {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </Button>
        )}
      </div>

      <div className="grid gap-1 border-b border-border px-4 py-3">
        <p className={EYEBROW} aria-live={autoplay ? "off" : "polite"}>{GUIDE_COPY.step(index, PREVIEWS.length)} · {current.preview.label}</p>
        <p className="text-label-sm text-foreground">{current.title}</p>
      </div>

      {/* Todas las vistas en la misma celda: la ventana toma la altura de la más alta y no salta. */}
      <div aria-hidden="true" className="grid bg-muted/30">
        {PREVIEWS.map((step, stepIndex) => (
          <div key={step.id}
            className={cn(PREVIEW_BODY, "[grid-area:1/1] transition-[opacity,translate] duration-300 motion-reduce:transition-none",
              stepIndex === index ? "translate-y-0 opacity-100" : "invisible translate-y-1 opacity-0")}>
            {step.preview.body}
          </div>
        ))}
      </div>
    </section>
  )
}
