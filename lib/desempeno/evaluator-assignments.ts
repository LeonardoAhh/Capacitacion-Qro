import { supabase } from "@/lib/supabase/client"

/** Cuentas compartidas con rol evaluador y las personas que pueden evaluar. */
export type EvaluatorAccount = {
  user_id: string
  display_name: string
  email: string
  departamentos: string[] | null
}

export type AssignableEmployee = {
  numero: string
  nombre: string
  puesto: string | null
  departamento: string | null
}

type EmployeeRow = AssignableEmployee & { tipo_contrato?: string | null }

const EMPLOYEE_COLUMNS = "numero,nombre,puesto,departamento"
const NEW_HIRE_COLUMNS = "numero,nombre,puesto,departamento,tipo_contrato"
const ASSIGNMENTS_TABLE = "evaluator_employee_assignments"
const EVALUATOR_ROLE = "evaluador"
const SEARCH_LIMIT = 10
const CHUNK_SIZE = 100

export const byName = (a: AssignableEmployee, b: AssignableEmployee) => a.nombre.localeCompare(b.nombre, "es")

/** Une plantilla y nuevo ingreso por número; manda el registro de nuevo ingreso mientras no sea indeterminado. */
function resolveEmployees(plantRows: EmployeeRow[], newHireRows: EmployeeRow[]): AssignableEmployee[] {
  const plant = new Map(plantRows.filter(row => row.numero).map(row => [row.numero, row]))
  const newHires = new Map(newHireRows.filter(row => row.numero).map(row => [row.numero, row]))
  return [...new Set([...plant.keys(), ...newHires.keys()])]
    .map(number => {
      const hire = newHires.get(number)
      return (hire && hire.tipo_contrato !== "Indeterminado" ? hire : plant.get(number) ?? hire) as AssignableEmployee
    })
    .sort(byName)
}

export async function searchEmployees(term: string): Promise<AssignableEmployee[]> {
  const pattern = `%${term.replace(/[%_]/g, "")}%`
  const [plantNumber, plantName, hireNumber, hireName] = await Promise.all([
    supabase.from("employees").select(EMPLOYEE_COLUMNS).ilike("numero", pattern).limit(SEARCH_LIMIT),
    supabase.from("employees").select(EMPLOYEE_COLUMNS).ilike("nombre", pattern).limit(SEARCH_LIMIT),
    supabase.from("nuevo_ingreso").select(NEW_HIRE_COLUMNS).ilike("numero", pattern).limit(SEARCH_LIMIT),
    supabase.from("nuevo_ingreso").select(NEW_HIRE_COLUMNS).ilike("nombre", pattern).limit(SEARCH_LIMIT),
  ])
  const error = [plantNumber, plantName, hireNumber, hireName].find(result => result.error)?.error
  if (error) throw error
  return resolveEmployees(
    [...(plantNumber.data ?? []), ...(plantName.data ?? [])] as EmployeeRow[],
    [...(hireNumber.data ?? []), ...(hireName.data ?? [])] as EmployeeRow[],
  )
}

async function loadEmployees(numbers: string[]): Promise<AssignableEmployee[]> {
  if (!numbers.length) return []
  const plant: EmployeeRow[] = []
  const hires: EmployeeRow[] = []
  for (let offset = 0; offset < numbers.length; offset += CHUNK_SIZE) {
    const chunk = numbers.slice(offset, offset + CHUNK_SIZE)
    const [plantResult, hireResult] = await Promise.all([
      supabase.from("employees").select(EMPLOYEE_COLUMNS).in("numero", chunk),
      supabase.from("nuevo_ingreso").select(NEW_HIRE_COLUMNS).in("numero", chunk),
    ])
    if (plantResult.error || hireResult.error) throw plantResult.error ?? hireResult.error
    plant.push(...(plantResult.data ?? []) as EmployeeRow[])
    hires.push(...(hireResult.data ?? []) as EmployeeRow[])
  }
  return resolveEmployees(plant, hires)
}

export async function loadEvaluatorAccounts(): Promise<EvaluatorAccount[]> {
  const { data, error } = await supabase.from("profiles")
    .select("user_id,display_name,email,departamentos")
    .eq("role", EVALUATOR_ROLE)
    .order("display_name")
  if (error) throw error
  return (data ?? []) as EvaluatorAccount[]
}

/** Números asignados individualmente a la cuenta y sus datos de empleado. */
export async function loadAssignments(userId: string) {
  const { data, error } = await supabase.from(ASSIGNMENTS_TABLE)
    .select("numero_empleado")
    .eq("evaluator_user_id", userId)
    .order("numero_empleado")
  if (error) throw error
  const numbers = (data ?? []).map(row => row.numero_empleado as string)
  return { numbers, employees: await loadEmployees(numbers) }
}

export async function saveAccountDepartments(userId: string, departamentos: string[]) {
  const { data, error } = await supabase.from("profiles")
    .update({ departamentos })
    .eq("user_id", userId)
    .eq("role", EVALUATOR_ROLE)
    .select("departamentos")
    .single()
  if (error || !data) throw error ?? new Error("Sin respuesta")
}

export async function addAssignment(userId: string, numero: string) {
  const { error } = await supabase.from(ASSIGNMENTS_TABLE).insert({ evaluator_user_id: userId, numero_empleado: numero })
  if (error) throw error
}

export async function removeAssignment(userId: string, numero: string) {
  const { error } = await supabase.from(ASSIGNMENTS_TABLE).delete().eq("evaluator_user_id", userId).eq("numero_empleado", numero)
  if (error) throw error
}
