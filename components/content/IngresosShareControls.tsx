"use client"

import { useId } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { etiquetaTurno, TODOS } from "@/lib/ingresos/share-messages"

const FIELD = "grid min-w-0 content-start gap-2"

interface SegmentControlProps<T extends string> {
  label: string
  value: T
  onValueChange: (value: T) => void
  options: { value: T; label: string }[]
}

/** Elección única entre pocas opciones con el mismo diseño de pestañas del sistema. */
export function SegmentControl<T extends string>({ label, value, onValueChange, options }: SegmentControlProps<T>) {
  return (
    <div className={FIELD}>
      <p className="text-label-sm text-foreground">{label}</p>
      <Tabs value={value} onValueChange={(next) => onValueChange(next as T)}>
        <TabsList aria-label={label} className="grid w-full auto-cols-fr grid-flow-col">
          {options.map((option) => (
            <TabsTrigger key={option.value} value={option.value} className="min-w-0 truncate">
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
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
