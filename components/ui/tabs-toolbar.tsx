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

/** Medidas de la barra: la búsqueda y cada filtro ocupan lo mismo en todas las páginas. */
export const TOOLBAR_SEARCH = "w-full sm:w-56"
export const TOOLBAR_FILTER = "w-[calc(50%-0.25rem)] sm:w-40"

export function TabsBar({ slotRef, children, className }: {
  slotRef: (element: HTMLDivElement | null) => void
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-center gap-x-4 gap-y-3", className)}>
      {children}
      {/* Baja a su propia línea cuando no caben 18rem junto a las pestañas. */}
      <div ref={slotRef} className="flex min-w-0 flex-1 basis-72 flex-wrap items-center justify-end gap-2" />
    </div>
  )
}

export function TabsToolbar({ children }: { children: ReactNode }) {
  const slot = useContext(SlotContext)
  return slot ? createPortal(children, slot) : null
}
