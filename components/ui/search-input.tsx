"use client"

import { useEffect, useRef, type ComponentProps } from "react"
import { LoaderCircle, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const SEARCH_DELAY_MS = 300

interface SearchInputProps extends Omit<ComponentProps<"input">, "type" | "value" | "onChange" | "aria-label"> {
  value: string
  onValueChange: (value: string) => void
  /**
   * Búsqueda que consulta datos: se lanza sola al dejar de escribir y al
   * instante con Enter o al limpiar. Sin ella, el campo solo filtra en vivo.
   */
  onSearch?: (value: string) => void
  /** Al limpiar con la X, además de buscar vacío (p. ej. reiniciar una selección). */
  onClear?: () => void
  loading?: boolean
  /** Nombre accesible del campo. */
  label: string
}

/**
 * Barra de búsqueda única de la app: lupa (o carga) a la izquierda y X para
 * limpiar a la derecha. Sin botón "Buscar" aparte: no se repite el ícono.
 */
export function SearchInput({
  value, onValueChange, onSearch, onClear, loading = false, label, className, onKeyDown, ...props
}: SearchInputProps) {
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const searchNow = (next: string) => {
    window.clearTimeout(timer.current)
    onSearch?.(next)
  }

  const Icon = loading ? LoaderCircle : Search

  return (
    <div className={cn("relative min-w-0", className)}>
      <Icon aria-hidden="true"
        className={cn("pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
          loading && "animate-spin motion-reduce:animate-none")} />
      <Input
        type="search"
        aria-label={label}
        value={value}
        className={cn("pl-9 [&::-webkit-search-cancel-button]:appearance-none", value && "pr-9")}
        onChange={(event) => {
          const next = event.target.value
          onValueChange(next)
          if (!onSearch) return
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => onSearch(next), SEARCH_DELAY_MS)
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.key === "Enter") searchNow(value)
        }}
        {...props}
      />
      {value && (
        <button type="button" aria-label="Limpiar búsqueda"
          className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => {
            onValueChange("")
            searchNow("")
            onClear?.()
          }}>
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
