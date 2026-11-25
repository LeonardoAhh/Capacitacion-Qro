"use client"

import { useLinkStatus } from "next/link"
import { Loader2, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Ícono de un enlace que, mientras su página carga, cede el lugar a un spinner del mismo
 * tamaño (solo si tarda más de 150ms: globals.css, .link-pending-*). Va dentro de un <Link>
 * (useLinkStatus lee ese enlace): barra lateral, botones que llevan a otra página, etc.
 */
export function LinkPendingIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  const { pending } = useLinkStatus()
  if (!pending) return <Icon className={className} aria-hidden="true" />
  return (
    <span className="grid shrink-0 place-items-center *:col-start-1 *:row-start-1">
      <Icon className={cn(className, "link-pending-out")} aria-hidden="true" />
      <span className="link-pending-in">
        <Loader2 className={cn(className, "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
      </span>
    </span>
  )
}
