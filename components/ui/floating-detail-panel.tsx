"use client"

import { useEffect, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ResponsiveShell, type ModalSize } from "@/components/ui/responsive-shell"
import { cn } from "@/lib/utils"

/** Paso entre los elementos de la lista sin cerrar el panel. */
export interface FloatingDetailNavigation {
  /** Posición del elemento abierto, desde 1. */
  index: number
  total: number
  onPrevious: () => void
  onNext: () => void
}

const TOOLBAR_BUTTON = "w-(--control-height-sm) px-0 text-muted-foreground hover:text-foreground focus-inset"

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable
}

/**
 * Detalle de un elemento de una lista en un panel flotante centrado (en celular, hoja inferior):
 * la lista queda completa detrás. ← y → del teclado también cambian de elemento. Cerrar y ‹ ›
 * flotan sobre el contenido (p. ej. sobre una foto); con `header`, van en su misma fila para no
 * tapar el texto. Alternativa a SideDetailPanel, que lo muestra como columna junto a la lista.
 */
export function FloatingDetailPanel({ title, description, onClose, navigation, size = "md", ownScroll = false, header, children }: {
  /** Nombre del panel para lectores de pantalla. */
  title: string
  description: string
  onClose: () => void
  navigation?: FloatingDetailNavigation
  size?: ModalSize
  /**
   * Desde tablet el contenido maneja su propio scroll (p. ej. dos columnas: solo los datos se
   * desplazan y la foto queda fija). Sin él, todo el panel hace scroll.
   */
  ownScroll?: boolean
  /** Encabezado del contenido (título y datos clave): los controles se ponen a su lado. */
  header?: ReactNode
  children: ReactNode
}) {
  const hasNavigation = Boolean(navigation && navigation.total > 1)

  useEffect(() => {
    if (!hasNavigation || !navigation) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isEditableTarget(event.target)) return
      if (event.key === "ArrowLeft" && navigation.index > 1) {
        event.preventDefault()
        navigation.onPrevious()
      } else if (event.key === "ArrowRight" && navigation.index < navigation.total) {
        event.preventDefault()
        navigation.onNext()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [hasNavigation, navigation])

  const controles = (
    // Hairline sobre bg-card sin apilar sombra extra encima del modal (AGENTS.md §5).
    <div className={cn("z-10 flex shrink-0 items-center rounded-(--radius-control) border border-border bg-card", !header && "absolute right-3 top-3 md:right-4 md:top-4")}>
      {hasNavigation && navigation && (
        <>
          <nav aria-label="Cambiar de elemento" className="flex items-center">
            <Button type="button" variant="ghost" size="sm" className={TOOLBAR_BUTTON} aria-label="Anterior"
              disabled={navigation.index <= 1} onClick={navigation.onPrevious}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="whitespace-nowrap px-1.5 text-body-sm tabular-nums text-foreground" aria-live="polite">
              {navigation.index} de {navigation.total}
            </span>
            <Button type="button" variant="ghost" size="sm" className={TOOLBAR_BUTTON} aria-label="Siguiente"
              disabled={navigation.index >= navigation.total} onClick={navigation.onNext}>
              <ChevronRight aria-hidden="true" />
            </Button>
          </nav>
          <span aria-hidden="true" className="h-4 w-px bg-border" />
        </>
      )}
      <Button type="button" variant="ghost" size="sm" className={TOOLBAR_BUTTON} aria-label="Cerrar detalle" onClick={onClose}>
        <X aria-hidden="true" />
      </Button>
    </div>
  )

  return (
    <ResponsiveShell open onClose={onClose} size={size} title={title} description={description}>
      <div className="relative flex min-h-0 flex-1 flex-col">
        {header ? (
          <div className="flex shrink-0 items-start gap-3 p-(--card-padding)">
            <div className="min-w-0 flex-1">{header}</div>
            {controles}
          </div>
        ) : controles}
        <div className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom,0px)] sm:pb-0",
          ownScroll && "md:flex md:flex-col md:overflow-hidden",
        )}>
          {children}
        </div>
      </div>
    </ResponsiveShell>
  )
}
