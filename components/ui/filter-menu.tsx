"use client"

import { ListFilter } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Valor que significa "sin filtrar" en cada faceta. */
export const FILTER_ALL = "all"

export interface FilterFacet {
  id: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

/**
 * Un solo botón "Filtros" con un submenú por faceta (menú en cascada): al pasar o
 * tocar una faceta se despliegan sus opciones al lado. Reemplaza una fila de
 * selects; el botón muestra cuántos filtros están activos.
 */
export function FilterMenu({ facets, onClear }: { facets: FilterFacet[]; onClear: () => void }) {
  const active = facets.filter(facet => facet.value !== FILTER_ALL)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={active.length ? `Filtros, ${active.length} activos` : "Filtros"}>
          <ListFilter aria-hidden="true" />
          Filtros
          {active.length > 0 && (
            <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-eyebrow tabular-nums text-primary-foreground" aria-hidden="true">
              {active.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {facets.map(facet => {
          const selected = facet.options.find(option => option.value === facet.value)
          return (
            <DropdownMenuSub key={facet.id}>
              <DropdownMenuSubTrigger className="gap-3">
                <span className="flex-1">{facet.label}</span>
                <span className="max-w-28 truncate text-body-sm text-muted-foreground">{selected?.label ?? "Todos"}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-80 w-56 overflow-y-auto">
                <DropdownMenuRadioGroup value={facet.value} onValueChange={facet.onChange}>
                  <DropdownMenuRadioItem value={FILTER_ALL}>Todos</DropdownMenuRadioItem>
                  {facet.options.map(option => (
                    <DropdownMenuRadioItem key={option.value} value={option.value}>{option.label}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )
        })}
        {active.length > 0 && <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onClear}>Limpiar filtros</DropdownMenuItem>
        </>}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
