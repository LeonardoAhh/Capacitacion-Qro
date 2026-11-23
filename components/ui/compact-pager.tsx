"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CompactPagerProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  /** Nombre accesible de la paginación (p. ej. "Paginación de hallazgos"). */
  label?: string
}

/** Paginación mínima para barras de herramientas: ‹ 1 de 11 ›. Con una sola página no se muestra. */
export function CompactPager({ page, totalPages, onPageChange, label = "Paginación" }: CompactPagerProps) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label={label} className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:bg-transparent hover:text-foreground"
        aria-label="Página anterior" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft aria-hidden="true" />
      </Button>
      <span className="whitespace-nowrap text-body-sm tabular-nums text-foreground" aria-live="polite">
        {page} de {totalPages}
      </span>
      <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:bg-transparent hover:text-foreground"
        aria-label="Página siguiente" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  )
}
