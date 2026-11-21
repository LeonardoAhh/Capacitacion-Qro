"use client"

import { useId } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { etiquetaTurno, TODOS } from "@/lib/ingresos/share-messages"
import { cn } from "@/lib/utils"

const FIELD = "grid min-w-0 content-start gap-2"

interface SegmentControlProps<T extends string> {
  label: string
  value: T
  onValueChange: (value: T) => void
  options: { value: T; label: string }[]
}

/**
 * Elección única entre pocas opciones. Mismo aspecto que las pestañas del sistema;
 * semánticamente es un grupo de botones con estado (aria-pressed), no pestañas.
 */
export function SegmentControl<T extends string>({ label, value, onValueChange, options }: SegmentControlProps<T>) {
  return (
    <fieldset className={FIELD}>
      <legend className="mb-2 text-label-sm text-foreground">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col rounded-md border border-border bg-muted p-0.5">
        {options.map(option => {
          const active = option.value === value
          return (
            <button key={option.value} type="button" aria-pressed={active} onClick={() => onValueChange(option.value)}
              className={cn(
                "min-h-10 min-w-0 truncate rounded-md border px-3 text-label-sm transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active ? "border-border bg-card text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}>
              {option.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

interface ShareFiltersProps {
  departments: string[]
  turnos: string[]
  filterDept: string
  onDeptChange: (value: string) => void
  filterTurno: string
  onTurnoChange: (value: string) => void
  urgencySort: boolean
  onUrgencySortChange: (value: boolean) => void
  /** Solo aplica a evaluaciones; undefined oculta la opción. */
  incluirTodas?: boolean
  onIncluirTodasChange: (value: boolean) => void
}

function SwitchRow({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (value: boolean) => void }) {
  const id = useId()
  return (
    <div className="flex min-h-(--control-height) items-center justify-between gap-4">
      <Label htmlFor={id} className="cursor-pointer">{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

/** Departamento, turno y orden: siempre visibles, son pocos y definen a quién va el mensaje. */
export function ShareFilters({
  departments, turnos, filterDept, onDeptChange, filterTurno, onTurnoChange, urgencySort, onUrgencySortChange,
  incluirTodas, onIncluirTodasChange,
}: ShareFiltersProps) {
  const deptId = useId()
  const turnoId = useId()

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={FIELD}>
          <Label htmlFor={deptId}>Departamento</Label>
          <Select value={filterDept} onValueChange={onDeptChange}>
            <SelectTrigger id={deptId}><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={TODOS}>Todos</SelectItem>
              {departments.map(department => <SelectItem key={department} value={department}>{department}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className={FIELD}>
          <Label htmlFor={turnoId}>Turno</Label>
          <Select value={filterTurno} onValueChange={onTurnoChange}>
            <SelectTrigger id={turnoId}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {turnos.map(turno => <SelectItem key={turno} value={turno}>{etiquetaTurno(turno)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid">
        <SwitchRow label="Priorizar vencidas" checked={urgencySort} onCheckedChange={onUrgencySortChange} />
        {incluirTodas !== undefined && (
          <SwitchRow label="Incluir las que van a tiempo" checked={incluirTodas} onCheckedChange={onIncluirTodasChange} />
        )}
      </div>
    </div>
  )
}
