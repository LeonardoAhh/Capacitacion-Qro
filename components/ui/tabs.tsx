"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

/**
 * Subrayado de la pestaña activa que se desliza al cambiar (en vez de saltar). Mide la
 * pestaña activa al montar, al cambiar de pestaña y al cambiar de tamaño; la primera
 * posición se coloca sin animar.
 */
function useActiveIndicator(list: HTMLElement | null) {
  const [box, setBox] = React.useState<{ left: number; width: number; animate: boolean } | null>(null)

  React.useEffect(() => {
    if (!list) return
    const medir = () => {
      // Solo en pestañas horizontales: las verticales (p. ej. Configuración) marcan la activa con su fondo.
      if (list.getAttribute("aria-orientation") === "vertical") {
        setBox(null)
        return
      }
      const activa = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
      setBox(current => activa
        ? { left: activa.offsetLeft, width: activa.offsetWidth, animate: current !== null }
        : null)
    }
    medir()
    const cambios = new MutationObserver(medir)
    cambios.observe(list, { subtree: true, attributes: true, attributeFilter: ["data-state", "aria-orientation"] })
    const tamano = new ResizeObserver(medir)
    tamano.observe(list)
    return () => {
      cambios.disconnect()
      tamano.disconnect()
    }
  }, [list])

  return box
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const [list, setList] = React.useState<HTMLDivElement | null>(null)
  const box = useActiveIndicator(list)
  const setRefs = React.useCallback((node: HTMLDivElement | null) => {
    setList(node)
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }, [ref])

  return (
    <TabsPrimitive.List
      ref={setRefs}
      className={cn(
        "relative inline-flex items-center gap-1 border-b border-border text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
      {box && (
        <span aria-hidden="true"
          className={cn("tabs-indicator pointer-events-none absolute -bottom-px left-0 h-0.5 rounded-full bg-primary", box.animate && "tabs-indicator-animate")}
          style={{ width: box.width, transform: `translateX(${box.left}px)` }} />
      )}
    </TabsPrimitive.List>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Estilo "line": texto sobre la línea base y subrayado en la pestaña activa.
      // El subrayado de la activa lo dibuja TabsList (se desliza); aquí solo el texto cambia de tono.
      "-mb-px inline-flex min-h-(--control-height) items-center justify-center whitespace-nowrap rounded-t-md border-b-2 border-transparent px-3 text-label-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      // La pestaña que entra aparece con un fundido corto (globals.css, .tabs-content-enter).
      "tabs-content-enter mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
