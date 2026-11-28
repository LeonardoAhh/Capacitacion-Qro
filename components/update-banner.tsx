"use client"

import { useEffect, useState } from "react"
import { addToast, closeToast } from "@/components/ui/toast/toast-store"
import { APP_UPDATE_COMPLETED_KEY, useAppUpdate } from "@/lib/hooks/useAppUpdate"

type BannerState = "available" | "applying" | "updated" | null

type BannerPreviewWindow = Window & {
  __previewUpdateBanner?: () => void
  __hideUpdateBanner?: () => void
}

const UPDATE_TOAST_ID = "app-update"
const UPDATED_DURATION_MS = 3000

/**
 * Avisa sobre actualizaciones del sistema usando el mismo Toaster global:
 * un solo toast compacto sin descripciones largas que pasa de disponible
 * a cargando y finalmente a actualizado en su lugar.
 */
export function UpdateBanner() {
  const { status, applyUpdate } = useAppUpdate()
  const [preview, setPreview] = useState<BannerState>(null)
  const [previewNonce, setPreviewNonce] = useState(0)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return

    const previewWindow = window as BannerPreviewWindow
    previewWindow.__previewUpdateBanner = () => {
      setPreview("available")
      setPreviewNonce(n => n + 1)
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
    const timer = setTimeout(() => setCompleted(false), UPDATED_DURATION_MS)
    return () => clearTimeout(timer)
  }, [completed])

  useEffect(() => {
    if (preview !== "applying") return
    const timer = setTimeout(() => setPreview("updated"), 700)
    return () => clearTimeout(timer)
  }, [preview])

  const state: BannerState = preview !== null
    ? preview
    : completed
      ? "updated"
      : status === "applying"
        ? "applying"
        : status === "available"
          ? "available"
          : null

  useEffect(() => {
    if (state === null) {
      closeToast(UPDATE_TOAST_ID)
      return
    }

    if (state === "available") {
      addToast({
        id: UPDATE_TOAST_ID,
        kind: "info",
        title: "Nueva versión disponible",
        description: undefined,
        duration: Infinity,
        action: {
          label: "Actualizar",
          closeOnClick: false,
          onClick: () => {
            if (preview !== null) setPreview("applying")
            else applyUpdate()
          },
        },
      })
      return
    }

    if (state === "applying") {
      addToast({
        id: UPDATE_TOAST_ID,
        kind: "loading",
        title: "Actualizando…",
        description: undefined,
        duration: Infinity,
        action: undefined,
      })
      return
    }

    addToast({
      id: UPDATE_TOAST_ID,
      kind: "success",
      title: "Aplicación actualizada",
      description: undefined,
      duration: UPDATED_DURATION_MS,
      action: undefined,
    })
  }, [state, preview, previewNonce, applyUpdate])

  useEffect(() => () => closeToast(UPDATE_TOAST_ID), [])

  return null
}
