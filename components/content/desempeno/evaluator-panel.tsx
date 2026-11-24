import { useId, type ReactNode } from "react"
import { Card } from "@/components/ui/card"

/**
 * Sección de la pantalla de asignaciones: título, ayuda y acción en la cabecera; contenido debajo.
 * Desde lg ocupa dos filas de la cuadrícula padre (subgrid): las cabeceras vecinas comparten
 * altura y sus bordes inferiores quedan alineados aunque la ayuda ocupe más líneas.
 */
export function EvaluatorPanel({ title, description, aside, children }: {
  title: string
  description: string
  aside?: ReactNode
  children: ReactNode
}) {
  const titleId = useId()
  return (
    <Card role="region" aria-labelledby={titleId} className="lg:row-span-2 lg:grid lg:grid-rows-subgrid lg:gap-0">
      <header className="flex items-start justify-between gap-4 border-b p-(--card-padding)">
        <div className="min-w-0 space-y-1">
          <h2 id={titleId} className="text-label-sm text-foreground">{title}</h2>
          <p className="text-body-sm text-muted-foreground">{description}</p>
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </header>
      <div className="space-y-3 p-(--card-padding)">{children}</div>
    </Card>
  )
}
