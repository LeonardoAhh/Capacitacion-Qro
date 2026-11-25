"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useAppReducedMotion } from "@/components/app-transition"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ImageExpansionProps {
  src: string
  alt: string
  ratio: number
  evidences?: string[]
  label?: string
  onClose: () => void
}

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

export function ImageExpansion({ src, alt, ratio, evidences, label = "Imágenes del hallazgo", onClose }: ImageExpansionProps) {
  const evidenceList = useMemo(() => (evidences?.length ? evidences : [src]), [evidences, src])
  const [activeEvidence, setActiveEvidence] = useState(src)
  const reducedMotion = useAppReducedMotion()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const imageHeight = Math.round(1600 / ratio)
  const activeIndex = Math.max(0, evidenceList.indexOf(activeEvidence))

  const stepImage = useCallback((delta: number) => {
    setActiveEvidence((current) => {
      const currentIndex = Math.max(0, evidenceList.indexOf(current))
      const nextIndex = (currentIndex + delta + evidenceList.length) % evidenceList.length
      return evidenceList[nextIndex]
    })
  }, [evidenceList])

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
        return
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        if (focusables.length > 0) {
          const first = focusables[0]
          const last = focusables[focusables.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
          }
        }
        return
      }
      if (evidenceList.length < 2) return

      if (event.key === "ArrowLeft") {
        event.preventDefault()
        stepImage(-1)
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        stepImage(1)
      } else if (event.key === "Home") {
        event.preventDefault()
        setActiveEvidence(evidenceList[0])
      } else if (event.key === "End") {
        event.preventDefault()
        setActiveEvidence(evidenceList[evidenceList.length - 1])
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus()
    }
  }, [onClose, evidenceList, stepImage])

  // Se monta en <body>: dentro del panel del contenido quedaba debajo del header.
  return createPortal(
    <motion.div
      ref={dialogRef}
      className="fixed inset-0 z-[100] grid place-items-center bg-background/80 p-4 backdrop-blur-md sm:p-8"
      aria-label={label}
      role="dialog"
      aria-modal="true"
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.16 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="absolute inset-x-4 top-[max(1rem,env(safe-area-inset-top,0px))] flex items-center justify-between gap-2 sm:inset-x-8 sm:top-8">
        {evidenceList.length > 1 ? (
          <p className="rounded-md border border-border bg-card px-3 py-1.5 text-body-sm tabular-nums text-foreground" aria-live="polite">
            {activeIndex + 1} de {evidenceList.length}
          </p>
        ) : <span />}
        <Button ref={closeButtonRef} type="button" variant="outline" size="sm" onClick={onClose}>
          <X aria-hidden="true" />
          Cerrar
        </Button>
      </div>

      <div className="flex min-w-0 max-w-[calc(100vw-2rem)] flex-col items-center gap-3 pt-12 sm:max-w-[calc(100vw-4rem)] sm:pt-10">
        <div className="flex items-center gap-2 sm:gap-4">
          {evidenceList.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label="Imagen anterior"
              onClick={() => stepImage(-1)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeEvidence}
              initial={reducedMotion ? false : { opacity: 0, scale: 0.995 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0, scale: 0.995 }}
              transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex min-w-0 max-w-full justify-center"
            >
              <Image
                src={activeEvidence}
                unoptimized
                alt={alt}
                width={1600}
                height={imageHeight}
                priority
                className="h-auto max-h-[calc(100dvh-13rem)] w-auto max-w-full rounded-md object-contain"
              />
            </motion.div>
          </AnimatePresence>
          {evidenceList.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label="Imagen siguiente"
              onClick={() => stepImage(1)}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          )}
        </div>
        {evidenceList.length > 1 && (
          <div className="flex w-full justify-center gap-2 px-1 pb-1" role="group" aria-label={label}>
            {evidenceList.map((evidence, evidenceIndex) => {
              const isActive = activeEvidence === evidence
              return (
                <button
                  key={evidence}
                  type="button"
                  aria-label={`Mostrar imagen ${evidenceIndex + 1} de ${evidenceList.length}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => setActiveEvidence(evidence)}
                  className={cn(
                    "min-w-0 w-full max-w-24 shrink overflow-hidden rounded-md border bg-muted transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    isActive ? "border-primary ring-2 ring-primary opacity-100" : "border-border opacity-70 hover:opacity-100",
                  )}
                >
                  <AspectRatio ratio={16 / 9} className="w-full">
                    <Image
                      src={evidence}
                      unoptimized
                      alt=""
                      fill
                      sizes="(min-width: 768px) 8rem, 25vw"
                      className="object-cover"
                    />
                  </AspectRatio>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>,
    document.body,
  )
}
