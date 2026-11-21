"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { useEffect, useRef } from "react"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { AnimatePresence, motion } from "framer-motion"
import { useAppReducedMotion } from "@/components/app-transition"

interface ImageExpansionProps {
  src: string
  alt: string
  ratio: number
  evidences?: string[]
  label?: string
  onClose: () => void
}

export function ImageExpansion({ src, alt, ratio, evidences, label = "Imágenes del hallazgo", onClose }: ImageExpansionProps) {
  const evidenceList = useMemo(() => evidences?.length ? evidences : [src], [evidences, src])
  const [activeEvidence, setActiveEvidence] = useState(src)
  const reducedMotion = useAppReducedMotion()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const imageHeight = Math.round(1600 / ratio)
  const activeIndex = evidenceList.indexOf(activeEvidence)

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
        return
      }
      if (evidenceList.length < 2) return

      if (event.key === "ArrowLeft") {
        event.preventDefault()
        setActiveEvidence((current) => {
          const currentIndex = evidenceList.indexOf(current)
          const nextIndex = (currentIndex - 1 + evidenceList.length) % evidenceList.length
          return evidenceList[nextIndex]
        })
      }
      if (event.key === "ArrowRight") {
        event.preventDefault()
        setActiveEvidence((current) => {
          const currentIndex = evidenceList.indexOf(current)
          const nextIndex = (currentIndex + 1) % evidenceList.length
          return evidenceList[nextIndex]
        })
      }
      if (event.key === "Home") {
        event.preventDefault()
        setActiveEvidence(evidenceList[0])
      }
      if (event.key === "End") {
        event.preventDefault()
        setActiveEvidence(evidenceList[evidenceList.length - 1])
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [onClose, evidenceList])

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-md sm:p-8"
      aria-label={label}
      role="region"
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.16 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 min-h-11 rounded-md px-3 text-button-md text-foreground underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:right-8 sm:top-8"
      >
        Cerrar
      </button>

      <div className="flex min-w-0 max-w-[calc(100vw-2rem)] flex-col items-center gap-3 sm:max-w-[calc(100vw-4rem)]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeEvidence}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.995 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, scale: 0.995 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="flex max-w-full justify-center"
          >
            <Image
              src={activeEvidence}
              unoptimized
              alt={alt}
              width={1600}
              height={imageHeight}
              priority
              className="h-auto max-h-[calc(100dvh-12rem)] w-auto max-w-full rounded-md object-contain"
            />
          </motion.div>
        </AnimatePresence>
        {evidenceList.length > 1 && (
          <p className="sr-only" aria-live="polite">
            Imagen {activeIndex + 1} de {evidenceList.length}
          </p>
        )}
        {evidenceList.length > 1 && (
          <div
            className="flex w-full justify-center gap-2 px-1 pb-1"
            aria-label={label}
          >
            {evidenceList.map((evidence, evidenceIndex) => (
              <button
                key={evidence}
                type="button"
                aria-label={`Mostrar imagen ${evidenceIndex + 1} de ${evidenceList.length}`}
                aria-current={activeEvidence === evidence ? "true" : undefined}
                onClick={() => setActiveEvidence(evidence)}
                className="min-w-0 w-full max-w-24 shrink overflow-hidden rounded-md border border-border bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
