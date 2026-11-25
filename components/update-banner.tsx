"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CircleCheck, Download, LoaderCircle } from "lucide"
import { X } from "lucide-react"
import { useAppReducedMotion } from "@/components/app-transition"
import { Button } from "@/components/ui/button"
import { NoticeIcon } from "@/components/ui/notice-icon"
import { APP_UPDATE_COMPLETED_KEY, useAppUpdate } from "@/lib/hooks/useAppUpdate"

type BannerPreview = "available" | "applying" | "updated" | null

type BannerPreviewWindow = Window & {
  __previewUpdateBanner?: () => void
  __hideUpdateBanner?: () => void
}

const COPY = {
  available: { title: "Nueva versión disponible", description: "Actualiza para no perderte las últimas funciones." },
  applying: { title: "Actualizando…", description: "Esto tarda unos segundos." },
  updated: { title: "Aplicación actualizada", description: "Ya tienes la versión más reciente." },
} as const

export function UpdateBanner() {
  const { status, applyUpdate } = useAppUpdate()
  const [preview, setPreview] = useState<BannerPreview>(null)
  const [completed, setCompleted] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const reduced = useAppReducedMotion()

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return

    const previewWindow = window as BannerPreviewWindow
    previewWindow.__previewUpdateBanner = () => {
      setDismissed(false)
      setPreview("available")
    }
    previewWindow.__hideUpdateBanner = () => setPreview(null)

    return () => {
      delete previewWindow.__previewUpdateBanner
      delete previewWindow.__hideUpdateBanner
    }
  }, [])

  useEffect(() => {
    try {
      if (sessionStorage.getItem(APP_UPDATE_COMPLETED_KEY) !== "1") return
      sessionStorage.removeItem(APP_UPDATE_COMPLETED_KEY)
      setCompleted(true)
    } catch {
      // Storage unavailable in restricted browser contexts.
    }
  }, [])

  useEffect(() => {
    if (!completed) return
    const timer = setTimeout(() => setCompleted(false), 4000)
    return () => clearTimeout(timer)
  }, [completed])

  useEffect(() => {
    if (preview === null || preview === "available") return
    const timer = setTimeout(() => setPreview(preview === "applying" ? "updated" : null), preview === "applying" ? 700 : 4000)
    return () => clearTimeout(timer)
  }, [preview])

  const applying = preview === "applying" || (preview === null && status === "applying")
  const updated = preview === "updated" || (preview === null && completed)
  const available = preview === "available" || (preview === null && status === "available")
  const visible = applying || updated || (available && !dismissed)
  const state = updated ? "updated" : applying ? "applying" : "available"
  const copy = COPY[state]

  const handleUpdate = () => {
    if (preview !== null) {
      setPreview("applying")
      return
    }
    applyUpdate()
  }

  const handleDismiss = () => {
    if (preview !== null) {
      setPreview(null)
      return
    }
    if (completed) {
      setCompleted(false)
      return
    }
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -16 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          className="app-update-banner"
        >
          <div
            role="status"
            aria-live="polite"
            className="ui-floating-surface flex min-h-14 items-center gap-3 rounded-(--notice-radius) py-2 pl-3 pr-2"
          >
            <NoticeIcon
              icon={updated ? CircleCheck : applying ? LoaderCircle : Download}
              tone={updated ? "success" : "neutral"}
              spin={applying}
            />
            <div className="min-w-0 flex-1">
              <p className="break-words text-label-sm text-foreground">{copy.title}</p>
              <p className="break-words text-body-sm text-muted-foreground">{copy.description}</p>
            </div>
            {!updated && (
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                onClick={handleUpdate}
                disabled={applying}
                aria-busy={applying}
              >
                Actualizar
              </Button>
            )}
            {!applying && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="size-8 shrink-0 px-0 text-muted-foreground hover:text-foreground"
                aria-label="Cerrar aviso de actualización"
                onClick={handleDismiss}
              >
                <X aria-hidden="true" />
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
