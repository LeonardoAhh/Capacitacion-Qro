"use client"

import { createContext, useContext, type ReactNode } from "react"
import { createPortal } from "react-dom"

/**
 * Barra de herramientas de /examenes: va en la misma línea que las pestañas.
 * Cada pestaña declara aquí su búsqueda y acciones con <ExamenesToolbar>;
 * solo la pestaña activa está montada, así que solo se ven las suyas.
 */
const ToolbarContext = createContext<HTMLElement | null>(null)

export const ExamenesToolbarProvider = ToolbarContext.Provider

export function ExamenesToolbar({ children }: { children: ReactNode }) {
  const target = useContext(ToolbarContext)
  return target ? createPortal(children, target) : null
}
