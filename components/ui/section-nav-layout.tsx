"use client"

import { useId, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

/** Fila de apartado; también la usan las pestañas verticales de Configuración. */
export const SECTION_NAV_ITEM = "flex min-h-(--control-height) w-full items-center gap-2 rounded-md border border-transparent px-2 text-left text-body-md transition-[background-color,border-color,box-shadow,color] duration-150 motion-reduce:transition-none focus-inset"
export const SECTION_NAV_ACTIVE = "border-sidebar-border bg-sidebar-active text-label-sm text-foreground shadow-(--sidebar-active-shadow)"
export const SECTION_NAV_IDLE = "text-muted-foreground hover:bg-card hover:text-foreground"
export const SECTION_NAV_ICON = "size-4 shrink-0"

export interface SectionNavItem<T extends string> {
  id: T
  label: string
  icon: LucideIcon
}

/**
 * Apartados de una página con navegación interna: lista lateral desde lg y select
 * en pantallas menores. El contenido del apartado activo va como children.
 */
export function SectionNavLayout<T extends string>({
  label,
  items,
  value,
  onValueChange,
  showNav = true,
  children,
}: {
  /** Nombre accesible de la navegación, p. ej. "Apartados de plantilla". */
  label: string
  items: readonly SectionNavItem<T>[]
  value: T
  onValueChange: (value: T) => void
  /** Con un solo apartado disponible para el rol, se oculta la navegación. */
  showNav?: boolean
  children: ReactNode
}) {
  const headingId = useId()
  const active = items.find((item) => item.id === value) ?? items[0]

  return (
    <div className={cn("grid items-start gap-6 dense:gap-4", showNav && "lg:grid-cols-[13rem_minmax(0,1fr)]")}>
      {showNav && (
        <aside className="min-w-0 lg:sticky lg:top-0">
          <Select
            value={value}
            onValueChange={(next) => {
              const item = items.find(({ id }) => id === next)
              if (item) onValueChange(item.id)
            }}
          >
            <SelectTrigger aria-label={label} className="w-full lg:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <nav aria-label={label} className="hidden lg:block">
            <ul className="space-y-0.5">
              {items.map(({ id, label: itemLabel, icon: Icon }) => {
                const current = id === value
                return (
                  <li key={id}>
                    <button
                      type="button"
                      aria-current={current || undefined}
                      onClick={() => onValueChange(id)}
                      className={cn(SECTION_NAV_ITEM, current ? SECTION_NAV_ACTIVE : SECTION_NAV_IDLE)}
                    >
                      <Icon className={cn(SECTION_NAV_ICON, current && "text-primary")} aria-hidden="true" />
                      <span className="min-w-0 truncate">{itemLabel}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>
      )}

      <section aria-labelledby={headingId} className="min-w-0">
        <h2 id={headingId} className="sr-only">{active.label}</h2>
        <div key={value} className="step-enter">
          {children}
        </div>
      </section>
    </div>
  )
}
