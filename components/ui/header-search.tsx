"use client"

import { createContext, useContext, useEffect, useRef, useState, type ComponentProps } from "react"
import { createPortal } from "react-dom"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { SearchInput } from "@/components/ui/search-input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/useMediaQuery"

/**
 * Aviso de "la búsqueda está aquí": un globo anclado a la lupa, con un pulso en su contorno,
 * que no se va solo. Sale en cada página con búsqueda hasta que la persona usa la lupa o
 * responde "Entendido"; cerrarlo de otra forma solo lo oculta en esa visita.
 * Se guarda por navegador; si el almacenamiento no está disponible, no se muestra.
 */
const HINT_KEY = "header-search-hint"
const HINT_DELAY_MS = 1200

type HintState = { usada: boolean; entendido: boolean }

function readHint(): HintState | null {
  try {
    const raw = window.localStorage.getItem(HINT_KEY)
    return { usada: false, entendido: false, ...(raw ? JSON.parse(raw) : {}) }
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

  // Aviso tras un momento en la página, mientras no se haya usado la lupa ni respondido "Entendido".
  useEffect(() => {
    const state = readHint()
    if (!state || state.usada || state.entendido) return
    const show = window.setTimeout(() => setHint(true), HINT_DELAY_MS)
    return () => window.clearTimeout(show)
  }, [])

  function entendido() {
    setHint(false)
    const state = readHint()
    if (state) writeHint({ ...state, entendido: true })
  }

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
    <Popover open={hint} onOpenChange={next => { if (!next) setHint(false) }}>
      <TooltipProvider delayDuration={300}>
        <Tooltip open={hover && !hint} onOpenChange={setHover}>
          <TooltipTrigger asChild>
            <PopoverAnchor asChild>
              <Button ref={toggleRef} type="button" variant="ghost" size="icon" className="relative shrink-0 text-muted-foreground"
                aria-label={active ? `${label}. Filtrando por: ${value}` : label} aria-expanded={open} onClick={openSearch}>
                <Search aria-hidden="true" />
                {active && <span aria-hidden="true" className="absolute right-2 top-2 size-2 rounded-sm bg-primary ring-2 ring-card" />}
                {/* Pulso del contorno mientras el aviso está abierto; sin animación con movimiento reducido. */}
                {hint && <span aria-hidden="true" className="pointer-events-none absolute inset-0 animate-ping rounded-md border-2 border-primary motion-reduce:animate-none" />}
              </Button>
            </PopoverAnchor>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end">Buscar</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {/* No roba el foco: quien está trabajando sigue donde estaba. */}
      <PopoverContent side="bottom" align="end" sideOffset={8} aria-label="La búsqueda está aquí" className="w-auto"
        onOpenAutoFocus={event => event.preventDefault()}>
        <p className="text-label-sm text-foreground">La búsqueda está aquí</p>
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={entendido}>Entendido</Button>
          <Button type="button" size="sm" onClick={openSearch}>Probar</Button>
        </div>
      </PopoverContent>
    </Popover>
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
              className="ui-floating-surface fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-50 overflow-hidden rounded-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 motion-reduce:animate-none">
              <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
              <div className="flex items-center gap-2 p-2">
                <SearchInput {...props} label={label} value={value} onValueChange={onValueChange} autoFocus
                  className="flex-1 [&_input]:border-0 [&_input]:shadow-none"
                  onKeyDown={event => { if (event.key === "Enter") setOpen(false) }} />
                <DialogPrimitive.Close asChild>
                  <Button type="button" variant="ghost" size="sm" className="shrink-0 text-muted-foreground hover:text-foreground">
                    Cerrar
                  </Button>
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
