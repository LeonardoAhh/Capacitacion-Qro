"use client"

import { createContext, useContext, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

/**
 * Pestañas con barra de herramientas en la misma línea: a la izquierda la lista
 * de pestañas y a la derecha la búsqueda, filtros y acciones de la pestaña
 * activa. Cada pestaña declara las suyas con <TabsToolbar>; Radix solo monta la
 * pestaña activa, así que solo se ven las de ella.
 *
 *   const [slot, setSlot] = useState<HTMLDivElement | null>(null)
 *   <TabsToolbarProvider value={slot}>
 *     <Tabs>
 *       <TabsBar slotRef={setSlot}><TabsList>…</TabsList></TabsBar>
 *       <TabsContent>… <TabsToolbar>…</TabsToolbar> …</TabsContent>
 */
const SlotContext = createContext<HTMLElement | null>(null)

export const TabsToolbarProvider = SlotContext.Provider

/**
 * Medidas de la barra: la búsqueda se encoge hasta 8rem antes de bajar de línea (y crece hasta
 * 14rem); cada filtro ocupa lo mismo en todas las páginas.
 */
export const TOOLBAR_SEARCH = "w-full sm:w-auto sm:min-w-32 sm:max-w-56 sm:flex-1"
export const TOOLBAR_FILTER = "w-[calc(50%-0.25rem)] sm:w-40"

export function TabsBar({ slotRef, children, className }: {
  slotRef: (element: HTMLDivElement | null) => void
  children?: ReactNode
  className?: string
}) {
  return (
    // @container: las acciones de cada pestaña pueden mostrar u ocultar su texto según el ancho
    // de esta barra (p. ej. tablet con la barra lateral abierta).
    <div className={cn("@container mb-4 flex flex-wrap items-center gap-x-4 gap-y-3", className)}>
      {children}
      {/* Junto a las pestañas si cabe su ancho mínimo (búsqueda encogida y acciones); si no, baja
          completa a su propia línea. Desde 36rem de barra sus piezas no se parten en dos filas. */}
      <div ref={slotRef} className="flex min-w-0 grow basis-[min-content] flex-wrap items-center justify-end gap-2 @xl:flex-nowrap" />
    </div>
  )
}

export function TabsToolbar({ children }: { children: ReactNode }) {
  const slot = useContext(SlotContext)
  return slot ? createPortal(children, slot) : null
}
