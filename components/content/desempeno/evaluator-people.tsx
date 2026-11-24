import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import type { AssignableEmployee } from "@/lib/desempeno/evaluator-assignments"
import { EvaluatorPanel } from "./evaluator-panel"
import type { EvaluatorAssignmentsState } from "./use-evaluator-assignments"

type Props = Pick<EvaluatorAssignmentsState,
  "query" | "setQuery" | "searchActive" | "searching" | "results" | "assignedNumbers" | "assignedEmployees" | "assignedSet"
  | "loadingAssignments" | "pendingNumber" | "addEmployee" | "removeEmployee">

const LIST = "divide-y rounded-md border"
const ROW = "flex min-h-(--control-height) items-center justify-between gap-3 px-3 py-1.5"
const NOTE = "rounded-md border border-dashed px-3 py-4 text-center text-body-md text-muted-foreground"

function EmployeeLine({ nombre, numero, detalle }: { nombre: string; numero: string; detalle?: string | null }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-label-sm text-foreground">{nombre}</span>
      <span className="block truncate text-body-sm text-muted-foreground">#{numero}{detalle ? ` · ${detalle}` : ""}</span>
    </span>
  )
}

/** Personas asignadas una por una: búsqueda para agregar y lista para quitar. */
export function EvaluatorPeople({
  query, setQuery, searchActive, searching, results, assignedNumbers, assignedEmployees, assignedSet,
  loadingAssignments, pendingNumber, addEmployee, removeEmployee,
}: Props) {
  const byNumber = new Map<string, AssignableEmployee>(assignedEmployees.map(employee => [employee.numero, employee]))

  return (
    <EvaluatorPanel
      title="Personas asignadas"
      description="Se suman a las áreas. Quitar una asignación no excluye a alguien incluido por su departamento."
    >
      <SearchInput label="Buscar empleado para asignar" placeholder="Buscar por número o nombre" value={query} onValueChange={setQuery} loading={searching} />

      {searchActive && !searching && (
        results.length === 0
          ? <p className={NOTE}>Sin coincidencias</p>
          : <ul aria-label="Resultados de búsqueda" className={`${LIST} max-h-64 overflow-y-auto`}>
              {results.map(employee => {
                const assigned = assignedSet.has(employee.numero)
                return (
                  <li key={employee.numero} className={ROW}>
                    <EmployeeLine nombre={employee.nombre} numero={employee.numero} detalle={employee.puesto || employee.departamento || "Sin puesto"} />
                    <Button type="button" size="sm" variant="outline" disabled={assigned || pendingNumber !== null || loadingAssignments} onClick={() => addEmployee(employee)}>
                      {!assigned && <Plus aria-hidden="true" />}
                      {assigned ? "Asignado" : "Asignar"}
                    </Button>
                  </li>
                )
              })}
            </ul>
      )}

      <p className="text-body-sm tabular-nums text-muted-foreground">{assignedNumbers.length} asignadas individualmente</p>
      {loadingAssignments ? <p className={NOTE}>Cargando asignaciones…</p>
        : assignedNumbers.length === 0 ? <p className={NOTE}>Aún no hay personas asignadas individualmente.</p>
        : <ul aria-label="Personas asignadas" className={LIST}>
            {assignedNumbers.map(number => {
              const employee = byNumber.get(number)
              const nombre = employee?.nombre ?? `#${number}`
              return (
                <li key={number} className={ROW}>
                  <EmployeeLine nombre={nombre} numero={number} detalle={employee?.puesto} />
                  <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive"
                    disabled={pendingNumber !== null} onClick={() => removeEmployee(number)} aria-label={`Quitar asignación de ${nombre}`}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              )
            })}
          </ul>}
    </EvaluatorPanel>
  )
}
