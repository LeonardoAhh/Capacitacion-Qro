import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { EvaluatorPanel } from "./evaluator-panel"
import type { EvaluatorAssignmentsState } from "./use-evaluator-assignments"

type Props = Pick<EvaluatorAssignmentsState, "departmentOptions" | "departments" | "toggleDepartment" | "hasDepartmentChanges" | "saveDepartments" | "saving" | "busy">

/** Departamentos que la cuenta evalúa completos. */
export function EvaluatorAreas({ departmentOptions, departments, toggleDepartment, hasDepartmentChanges, saveDepartments, saving, busy }: Props) {
  return (
    <EvaluatorPanel
      title="Áreas completas"
      description="Incluye a todas las personas del departamento. Desmarca todas para usar solo asignaciones individuales."
      aside={
        <Button type="button" size="sm" onClick={saveDepartments} disabled={!hasDepartmentChanges || busy}>
          {saving && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          Guardar
        </Button>
      }
    >
      <p className="text-body-sm tabular-nums text-muted-foreground">{departments.length} de {departmentOptions.length} áreas</p>
      <fieldset className="grid gap-1 sm:grid-cols-2">
        <legend className="sr-only">Áreas completas</legend>
        {departmentOptions.map(department => (
          <label key={department}
            className="flex min-h-(--control-height) cursor-pointer items-center gap-2 rounded-md px-2 text-body-md text-foreground transition-colors hover:bg-muted has-focus-visible:bg-muted">
            <Checkbox checked={departments.includes(department)} onCheckedChange={checked => toggleDepartment(department, checked === true)} />
            <span className="truncate">{department}</span>
          </label>
        ))}
      </fieldset>
    </EvaluatorPanel>
  )
}
