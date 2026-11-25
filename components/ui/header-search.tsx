"use client"

import { createContext, useContext, useEffect, useRef, useState, type ComponentProps } from "react"
import { createPortal } from "react-dom"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/useMediaQuery"

/**
 * Aviso de "aquí puedes buscar" para quien aún no ha usado la lupa: aparece solo de vez en
 * cuando (un intervalo de días y un máximo de veces) y deja de salir en cuanto la abre.
 * Se guarda por navegador; si el almacenamiento no está disponible, no se muestra.
 */
const HINT_KEY = "header-search-hint"
const HINT_DELAY_MS = 1200
const HINT_VISIBLE_MS = 6000
const HINT_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000
const HINT_MAX = 5

type HintState = { usada: boolean; veces: number; ultima: number }

function readHint(): HintState | null {
  try {
    const raw = window.localStorage.getItem(HINT_KEY)
    return raw ? { usada: false, veces: 0, ultima: 0, ...JSON.parse(raw) } : { usada: false, veces: 0, ultima: 0 }
  } catch {
    return null
  }
}

function writeHint(next: HintState) {
  try { window.localStorage.setItem(HINT_KEY, JSON.stringify(next)) } catch { /* sin almacenamiento: sin aviso */ }
}

/** Lugar del header donde cada página coloca su búsqueda (lo crea el Dashboard). */
export const HeaderSearchSlot = createContext<HTMLElement | null>(null)

/**
 * Búsqueda de la página en el header: una lupa que abre la barra de búsqueda de siempre
 * (SearchInput). En tablet y escritorio se abre ahí mismo y se cierra sola al salir vacía o
 * con Esc; con texto se queda abierta para que se vea qué se está filtrando. En celular no hay
 * espacio junto al título: se abre un panel flotante arriba con el fondo desenfocado y, al
 * cerrarlo (Esc, Enter o tocar fuera), la lista ya queda filtrada y la lupa lo indica con un punto.
 */
export function HeaderSearch({ label, value, onValueChange, ...props }: ComponentProps<typeof SearchInput>) {
  const slot = useContext(HeaderSearchSlot)
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const wasExpanded = useRef(false)
  const [hint, setHint] = useState(false)
  const [hover, setHover] = useState(false)
  // Solo en tablet y escritorio la barra se queda abierta en el header.
  const expanded = desktop && (open || value !== "")

  // Aviso ocasional: tras un momento en la página, si toca según el intervalo y el máximo.
  useEffect(() => {
    const state = readHint()
    if (!state || state.usada || state.veces >= HINT_MAX || Date.now() - state.ultima < HINT_INTERVAL_MS) return
    const show = window.setTimeout(() => {
      writeHint({ ...state, veces: state.veces + 1, ultima: Date.now() })
      setHint(true)
    }, HINT_DELAY_MS)
    const hide = window.setTimeout(() => setHint(false), HINT_DELAY_MS + HINT_VISIBLE_MS)
    return () => { window.clearTimeout(show); window.clearTimeout(hide) }
  }, [])

  function openSearch() {
    setHint(false)
    const state = readHint()
    if (state && !state.usada) writeHint({ ...state, usada: true })
    setOpen(true)
  }

  // Al cerrar, el foco regresa a la lupa (no se pierde en el documento).
  useEffect(() => {
    if (wasExpanded.current && !expanded) toggleRef.current?.focus()
    wasExpanded.current = expanded
  }, [expanded])

  if (!slot) return null

  const active = value !== ""
  const toggle = (
    <TooltipProvider delayDuration={300}>
      <Tooltip open={hint || hover} onOpenChange={next => { setHover(next); if (!next) setHint(false) }}>
        <TooltipTrigger asChild>
          <Button ref={toggleRef} type="button" variant="ghost" size="icon" className="relative shrink-0 text-muted-foreground"
            aria-label={active ? `${label}. Filtrando por: ${value}` : label} aria-expanded={false} onClick={openSearch}>
            <Search aria-hidden="true" />
            {/* Celular: hay una búsqueda aplicada aunque el panel esté cerrado. */}
            {active && <span aria-hidden="true" className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-card" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">{hint ? "Ahora la búsqueda está aquí" : "Buscar"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  if (!desktop) {
    return createPortal(
      <>
        {toggle}
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 motion-reduce:animate-none" />
            {/* data-dialog-layout="standard": anula el relleno inferior global de los diálogos (globals.css). */}
            <DialogPrimitive.Content data-dialog-layout="standard" aria-describedby={undefined}
              className="ui-floating-surface fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-50 overflow-hidden rounded-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 motion-reduce:animate-none">
              <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
              <div className="flex items-center gap-2 p-2">
                <SearchInput {...props} label={label} value={value} onValueChange={onValueChange} autoFocus
                  className="flex-1 [&_input]:border-0 [&_input]:shadow-none [&_input]:focus-visible:ring-0"
                  onKeyDown={event => { if (event.key === "Enter") setOpen(false) }} />
                <DialogPrimitive.Close className="shrink-0 rounded-md border border-border px-2 py-1 text-eyebrow uppercase text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  Esc
                </DialogPrimitive.Close>
              </div>
              <p className="border-t border-border px-4 py-6 text-center text-body-sm text-muted-foreground">
                {active ? "Cierra para ver la lista filtrada." : "Filtra la lista de esta página."}
              </p>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </>,
      slot,
    )
  }

  return createPortal(
    expanded ? (
      <div className="header-search"
        onBlur={event => {
          if (!value && !event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
        }}>
        {/* Alto compacto (control-height-sm): el header mide 48px (design.md) y así el campo
            respira arriba y abajo en lugar de tocar los bordes. */}
        <SearchInput {...props} label={label} value={value} onValueChange={onValueChange} autoFocus={open}
          className="[&_input]:h-(--control-height-sm)"
          onKeyDown={event => {
            if (event.key !== "Escape") return
            event.preventDefault()
            onValueChange("")
            props.onSearch?.("")
            setOpen(false)
          }} />
      </div>
    ) : toggle,
    slot,
  )
}
