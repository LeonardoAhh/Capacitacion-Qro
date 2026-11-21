"use client"

import { useId, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import type { EmployeePending } from "@/lib/hooks/usePendingEvals"
import { etiquetaTurno, SEARCH_MAX_LENGTH, tieneVencida, type ShareTopic } from "@/lib/ingresos/share-messages"

interface IngresosEmployeeSelectionDialogProps {
  employees: EmployeePending[]
  selectedIds: Set<string>
  topic: ShareTopic
  onClose: () => void
  onApply: (ids: Set<string>) => void
}

function coincide(employee: EmployeePending, query: string) {
  return employee.nombre.toLocaleLowerCase("es-MX").includes(query) || Boolean(employee.numero?.includes(query))
}

/** Elegir a quién incluir. Los cambios se aplican solo al confirmar. */
export function IngresosEmployeeSelectionDialog({
  employees, selectedIds, topic, onClose, onApply,
}: IngresosEmployeeSelectionDialogProps) {
  const [draftIds, setDraftIds] = useState(() => new Set(selectedIds))
  const [query, setQuery] = useState("")
  const searchId = useId()
  const allId = useId()

  const visibles = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es-MX")
    return normalized ? employees.filter(employee => coincide(employee, normalized)) : employees
  }, [employees, query])
  const seleccionadosVisibles = visibles.filter(employee => draftIds.has(employee.dbId)).length
  const todos = visibles.length > 0 && seleccionadosVisibles === visibles.length

  function toggle(id: string) {
    setDraftIds(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Marca o desmarca solo lo que la búsqueda deja visible.
  function toggleVisibles() {
    setDraftIds(current => {
      const next = new Set(current)
      for (const employee of visibles) {
        if (todos) next.delete(employee.dbId)
        else next.add(employee.dbId)
      }
      return next
    })
  }

  return (
    <ResponsiveShell open onClose={onClose} size="md" title="Seleccionar empleados"
      description="Elige quiénes aparecerán en el mensaje">
      <ModalHeader title="Seleccionar empleados" onClose={onClose} />

      <div className="grid shrink-0 gap-2 border-b border-border px-4 py-3 sm:px-6">
        <label htmlFor={searchId} className="sr-only">Buscar empleado</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input id={searchId} type="search" placeholder="Buscar por nombre o número" autoComplete="off"
            value={query} maxLength={SEARCH_MAX_LENGTH} className="pl-9" onChange={event => setQuery(event.target.value)} />
        </div>
        <label htmlFor={allId} className="flex min-h-(--control-height) cursor-pointer items-center gap-3 rounded-md px-2 text-label-sm text-foreground hover:bg-muted">
          <Checkbox id={allId} checked={todos ? true : seleccionadosVisibles > 0 ? "indeterminate" : false}
            onCheckedChange={toggleVisibles} disabled={!visibles.length} />
          {query.trim() ? "Todos los resultados" : "Todos"}
          <span className="ml-auto text-body-sm font-normal tabular-nums text-muted-foreground">
            {seleccionadosVisibles} de {visibles.length}
          </span>
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2 sm:px-6">
        {visibles.length ? (
          <ul aria-label="Empleados" className="grid">
            {visibles.map(employee => {
              const id = `share-emp-${employee.dbId}`
              const meta = [employee.departamento, employee.turno ? etiquetaTurno(employee.turno) : null].filter(Boolean).join(" · ")
              return (
                <li key={employee.dbId}>
                  <label htmlFor={id} className="flex min-h-(--control-height) cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
                    <Checkbox id={id} checked={draftIds.has(employee.dbId)} onCheckedChange={() => toggle(employee.dbId)} />
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate text-label-sm text-foreground">
                        {employee.nombre}
                        {employee.numero && <span className="font-normal text-muted-foreground"> #{employee.numero}</span>}
                      </span>
                      {meta && <span className="truncate text-body-sm text-muted-foreground">{meta}</span>}
                    </span>
                    {tieneVencida(employee, topic) && <Badge variant="destructive" size="sm" className="shrink-0">Vencida</Badge>}
                  </label>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="py-6 text-center text-body-sm text-muted-foreground">Sin resultados.</p>
        )}
      </div>

      <ModalFooter onCancel={onClose} onConfirm={() => onApply(draftIds)} confirmLabel="Aplicar selección" />
    </ResponsiveShell>
  )
}
