import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"

/** Grupo de ajustes: rótulo pequeño opcional y filas separadas por una línea. */
export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="space-y-1">
      {title && <h3 className="text-eyebrow uppercase text-muted-foreground">{title}</h3>}
      <div className="divide-y">{children}</div>
    </section>
  )
}

/** Fila de ajuste: qué es a la izquierda y su control a la derecha (apilado en móvil). */
export function SettingsRow({ label, description, htmlFor, children }: {
  label: string
  description?: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        {htmlFor
          ? <Label htmlFor={htmlFor} className="cursor-pointer text-label-sm text-foreground">{label}</Label>
          : <p className="text-label-sm text-foreground">{label}</p>}
        {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center sm:justify-end">{children}</div>
    </div>
  )
}
