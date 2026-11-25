"use client"

import { motion } from "framer-motion"
import { APP_TRANSITION_EASE, useAppReducedMotion } from "@/components/app-transition"
import { cn } from "@/lib/utils"

// Mismos puntos en ambos estados para que la flecha se transforme (morph) en lugar de cambiar de golpe.
const FLECHA = {
  ocultar: "M16 15 L13 12 L16 9",
  mostrar: "M14 15 L17 12 L14 9",
}

/**
 * Ícono del control de la barra lateral (trazo de 24px, como Lucide). Con la barra visible,
 * el panel izquierdo se rellena y la flecha apunta a cerrarla; al ocultarla, el relleno se
 * apaga y la flecha gira para abrirla. Sin animación con "Reducir movimiento".
 */
export function SidebarToggleIcon({ collapsed, className }: { collapsed: boolean; className?: string }) {
  const reducedMotion = useAppReducedMotion()
  const transition = reducedMotion ? { duration: 0 } : { duration: 0.28, ease: APP_TRANSITION_EASE }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className={cn("size-4", className)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <motion.rect x="3" y="3" width="6" height="18" rx="2" fill="currentColor" stroke="none"
        initial={false} animate={{ opacity: collapsed ? 0 : 0.18 }} transition={transition} />
      <path d="M9 3 V21" />
      <motion.path initial={false} animate={{ d: collapsed ? FLECHA.mostrar : FLECHA.ocultar }} transition={transition} />
    </svg>
  )
}
