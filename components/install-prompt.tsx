"use client"

import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Smartphone } from "lucide"
import { Plus, Share, X } from "lucide-react"
import { useAppReducedMotion } from "@/components/app-transition"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { NoticeIcon } from "@/components/ui/notice-icon"
import { useChangelog } from "@/lib/hooks/useChangelog"

type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
  prompt(): Promise<void>
}

const DISMISS_KEY = "pwa-install-dismissed-at"
/** No aparece en cuanto carga la página. */
const SHOW_AFTER_MS = 15_000
const REPROMPT_AFTER_DAYS = 7
const DAY_MS = 86_400_000

function isStandalone(): boolean {
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true
  return (window.navigator as unknown as { standalone?: boolean }).standalone === true
}

/** iPhone, iPad y iPadOS (que se presenta como Mac con pantalla táctil). */
function isIOS(): boolean {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1)
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY))
    return at > 0 && (Date.now() - at) / DAY_MS < REPROMPT_AFTER_DAYS
  } catch {
    return false
  }
}

/**
 * Invitación a instalar la app, con la misma forma que el aviso de actualización.
 * Chromium: botón que abre el diálogo de instalación del navegador.
 * iOS: Safari no permite instalar desde la página, así que se muestran los pasos.
 * No aparece si ya está instalada; al cerrarla vuelve a ofrecerse en 7 días.
 */
export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [stepsOpen, setStepsOpen] = useState(false)
  const reduced = useAppReducedMotion()
  const { nuevo: hayNovedades } = useChangelog()

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return
    setIsIos(isIOS())

    const showTimer = setTimeout(() => setVisible(true), SHOW_AFTER_MS)
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setPrompt(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setVisible(false)
      setPrompt(null)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      clearTimeout(showTimer)
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    setStepsOpen(false)
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // Sin almacenamiento en contextos restringidos: solo se oculta en esta visita.
    }
  }, [])

  const install = useCallback(async () => {
    if (isIos) {
      setStepsOpen(true)
      return
    }
    if (!prompt) return
    try {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === "accepted") setVisible(false)
      else dismiss()
    } catch {
      dismiss()
    } finally {
      setPrompt(null)
    }
  }, [dismiss, isIos, prompt])

  // Sin diálogo del navegador ni iOS no hay forma de instalar: no se muestra.
  // Comparte lugar con el aviso de novedades: espera a que se vean para no encimarse.
  const canShow = visible && (prompt !== null || isIos) && !hayNovedades

  return (
    <>
      <AnimatePresence>
        {canShow && (
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
              <NoticeIcon icon={Smartphone} />
              <div className="min-w-0 flex-1">
                <p className="break-words text-label-sm text-foreground">Instalar la app</p>
                <p className="break-words text-body-sm text-muted-foreground">Para una mejor experiencia en tu dispositivo</p>
              </div>
              <Button type="button" size="sm" className="shrink-0" onClick={() => void install()}>
                Instalar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="size-8 shrink-0 px-0 text-muted-foreground hover:text-foreground"
                aria-label="Cerrar invitación para instalar"
                onClick={dismiss}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={stepsOpen} onOpenChange={setStepsOpen}>
        <DialogContent
          className="sm:max-w-md"
          footer={
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" className="touch-target" onClick={dismiss}>
                Ahora no
              </Button>
              <Button type="button" size="sm" className="touch-target" onClick={() => setStepsOpen(false)}>
                Entendido
              </Button>
            </DialogFooter>
          }
        >
          <DialogHeader>
            <DialogTitle>Instalar en iPhone o iPad</DialogTitle>
            <DialogDescription className="sr-only">Dos pasos en Safari.</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-body-md text-foreground">
            <li className="flex items-center gap-2">
              <span className="text-label-sm tabular-nums text-muted-foreground">1.</span>
              Toca
              <span className="inline-flex items-center gap-1 text-label-sm">
                <Share className="size-4" aria-hidden="true" />Compartir
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-label-sm tabular-nums text-muted-foreground">2.</span>
              Elige
              <span className="inline-flex items-center gap-1 text-label-sm">
                <Plus className="size-4" aria-hidden="true" />Agregar a inicio
              </span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  )
}
