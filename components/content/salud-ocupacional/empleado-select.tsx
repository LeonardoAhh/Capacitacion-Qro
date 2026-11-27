"use client"

import { useEffect, useId, useState, type KeyboardEvent } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SearchInput } from "@/components/ui/search-input"
import { Skeleton } from "@/components/ui/skeleton"
import { buscarEmpleadosPorNumero, type EmpleadoEncontrado } from "@/lib/salud-ocupacional"
import { cn } from "@/lib/utils"
import { limpiarNumeroEmpleado, NUMERO_EMPLEADO_MAX } from "@/lib/validations/empleado"

const SEARCH_DELAY_MS = 250

export interface EmpleadoElegido {
  numero: string
  nombre: string
}

/**
 * Selector de colaborador que busca solo por número de empleado: se abre con el
 * buscador listo; flechas y Enter eligen sin usar el ratón.
 */
export function EmpleadoSelect({ id, value, onChange, invalid }: {
  id: string
  value: EmpleadoElegido | null
  onChange: (empleado: EmpleadoElegido) => void
  invalid?: boolean
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [numero, setNumero] = useState("")
  const [resultados, setResultados] = useState<EmpleadoEncontrado[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [activo, setActivo] = useState(0)

  useEffect(() => {
    const digitos = numero.trim()
    if (!digitos) { setResultados([]); setLoading(false); setError(false); return }
    let active = true
    setLoading(true)
    const timer = window.setTimeout(() => {
      buscarEmpleadosPorNumero(digitos)
        .then(rows => { if (active) { setResultados(rows); setActivo(0); setError(false) } })
        .catch(() => { if (active) { setResultados([]); setError(true) } })
        .finally(() => { if (active) setLoading(false) })
    }, SEARCH_DELAY_MS)
    return () => { active = false; window.clearTimeout(timer) }
  }, [numero])

  function elegir(empleado: EmpleadoEncontrado) {
    onChange({ numero: empleado.numero, nombre: empleado.nombre })
    setOpen(false)
    setNumero("")
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!resultados.length) return
    if (event.key === "ArrowDown") { event.preventDefault(); setActivo(index => Math.min(index + 1, resultados.length - 1)) }
    if (event.key === "ArrowUp") { event.preventDefault(); setActivo(index => Math.max(index - 1, 0)) }
    if (event.key === "Enter") { event.preventDefault(); if (resultados[activo]) elegir(resultados[activo]) }
  }

  const estado = !numero.trim() ? "Escribe el número de empleado."
    : error ? "No se pudo buscar. Inténtalo de nuevo."
    : resultados.length ? null : "Sin coincidencias."

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" aria-invalid={invalid || undefined}
          className={cn("w-full justify-between px-3 font-normal", invalid && "border-destructive")}>
          <span className={cn("min-w-0 truncate", !value && "text-muted-foreground")}>
            {value ? <><span className="tabular-nums text-muted-foreground">#{value.numero}</span> · {value.nombre}</> : "Selecciona un colaborador"}
          </span>
          <ChevronDown className="shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="grid w-[var(--radix-popover-trigger-width)] min-w-[min(18rem,calc(100vw-2rem))] gap-1 p-1">
        <SearchInput label="Número de empleado" placeholder="Número de empleado" inputMode="numeric" autoFocus
          maxLength={NUMERO_EMPLEADO_MAX} value={numero} onValueChange={value => setNumero(limpiarNumeroEmpleado(value))} onKeyDown={onKeyDown} loading={loading}
          role="combobox" aria-expanded={resultados.length > 0} aria-controls={listId}
          aria-activedescendant={resultados[activo] ? `${listId}-${activo}` : undefined} />
        {loading && numero.trim()
          ? (
            <div role="status" aria-label="Buscando colaboradores" className="grid gap-1 p-1">
              {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
            </div>
          )
          : estado
          ? <p role="status" className="px-2 py-2 text-body-sm text-muted-foreground">{estado}</p>
          : (
            <ul id={listId} role="listbox" aria-label="Colaboradores" className="grid max-h-60 overflow-y-auto">
              {resultados.map((empleado, index) => (
                <li key={empleado.numero} id={`${listId}-${index}`} role="option" aria-selected={index === activo}
                  onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActivo(index)} onClick={() => elegir(empleado)}
                  className={cn("grid min-h-(--control-height) cursor-pointer content-center gap-0.5 rounded-sm px-2 py-1.5", index === activo && "bg-muted")}>
                  <span className="truncate text-body-md text-foreground"><span className="tabular-nums text-muted-foreground">#{empleado.numero}</span> · {empleado.nombre}</span>
                  {(empleado.puesto || empleado.departamento) && (
                    <span className="truncate text-body-sm text-muted-foreground">{empleado.puesto ?? empleado.departamento}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
      </PopoverContent>
    </Popover>
  )
}
