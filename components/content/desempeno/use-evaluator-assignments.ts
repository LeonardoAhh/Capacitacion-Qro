"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CATALOGO_ORGANIZACIONAL } from "@/lib/catalogos/organizacion"
import {
  addAssignment, byName, loadAssignments, loadEvaluatorAccounts, removeAssignment, saveAccountDepartments, searchEmployees,
  type AssignableEmployee, type EvaluatorAccount,
} from "@/lib/desempeno/evaluator-assignments"
import { notify } from "@/lib/notify"
import { registerUnsavedChangesGuard } from "@/lib/unsaved-changes"

const SEARCH_MIN_LENGTH = 2
const SEARCH_DELAY_MS = 250

const sameSet = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())

/** Estado y acciones de la pantalla de asignaciones; `enabled` solo con acceso confirmado. */
export function useEvaluatorAssignments(enabled: boolean) {
  const [accounts, setAccounts] = useState<EvaluatorAccount[]>([])
  const [selectedUserId, setSelectedUserId] = useState("")
  const [departments, setDepartments] = useState<string[]>([])
  const [assignedNumbers, setAssignedNumbers] = useState<string[]>([])
  const [assignedEmployees, setAssignedEmployees] = useState<AssignableEmployee[]>([])
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<AssignableEmployee[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pendingNumber, setPendingNumber] = useState<string | null>(null)

  const selectedAccount = accounts.find(account => account.user_id === selectedUserId)
  const departmentOptions = useMemo(
    () => [...new Set([...Object.keys(CATALOGO_ORGANIZACIONAL), ...(selectedAccount?.departamentos ?? [])])].sort((a, b) => a.localeCompare(b, "es")),
    [selectedAccount],
  )
  const assignedSet = useMemo(() => new Set(assignedNumbers), [assignedNumbers])
  const hasDepartmentChanges = !sameSet(departments, selectedAccount?.departamentos ?? [])
  const busy = saving || loadingAssignments || pendingNumber !== null
  const searchActive = query.trim().length >= SEARCH_MIN_LENGTH

  useEffect(() => {
    if (!enabled) return
    let active = true
    loadEvaluatorAccounts()
      .then(next => {
        if (!active) return
        setAccounts(next)
        setSelectedUserId(current => next.some(account => account.user_id === current) ? current : next[0]?.user_id ?? "")
      })
      .catch(() => { if (active) notify.error("No se pudieron cargar las cuentas evaluadoras") })
      .finally(() => { if (active) setLoadingAccounts(false) })
    return () => { active = false }
  }, [enabled])

  useEffect(() => {
    setDepartments(selectedAccount?.departamentos ?? [])
  }, [selectedAccount])

  const confirmDiscard = useCallback(() => notify.confirm({
    title: "Descartar cambios",
    description: "Las áreas de esta cuenta no se han guardado.",
    confirmLabel: "Descartar",
    tone: "warning",
    size: "xs",
  }), [])

  // Con áreas sin guardar: la guardia cubre la barra lateral y el header; el navegador
  // pide confirmación al recargar o cerrar la pestaña.
  useEffect(() => {
    if (!hasDepartmentChanges) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", onBeforeUnload)
    const unregister = registerUnsavedChangesGuard(confirmDiscard)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      unregister()
    }
  }, [confirmDiscard, hasDepartmentChanges])

  const selectAccount = async (userId: string) => {
    if (userId === selectedUserId) return
    if (hasDepartmentChanges && !(await confirmDiscard())) return
    setSelectedUserId(userId)
  }

  useEffect(() => {
    if (!selectedUserId || !enabled) return
    let active = true
    setLoadingAssignments(true)
    loadAssignments(selectedUserId)
      .then(({ numbers, employees }) => {
        if (!active) return
        setAssignedNumbers(numbers)
        setAssignedEmployees(employees)
      })
      .catch(() => { if (active) notify.error("No se pudieron cargar las personas asignadas") })
      .finally(() => { if (active) setLoadingAssignments(false) })
    return () => { active = false }
  }, [selectedUserId, enabled])

  useEffect(() => {
    const term = query.trim()
    if (!enabled || term.length < SEARCH_MIN_LENGTH) { setResults([]); setSearching(false); return }
    let active = true
    setSearching(true)
    const timer = window.setTimeout(() => {
      searchEmployees(term)
        .then(employees => { if (active) setResults(employees) })
        .catch(() => { if (active) notify.error("No se pudo buscar empleados") })
        .finally(() => { if (active) setSearching(false) })
    }, SEARCH_DELAY_MS)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query, enabled])

  const toggleDepartment = (department: string, checked: boolean) =>
    setDepartments(current => checked ? [...current, department] : current.filter(value => value !== department))

  const saveDepartments = async () => {
    if (!selectedUserId || !selectedAccount || !hasDepartmentChanges) return
    setSaving(true)
    try {
      await saveAccountDepartments(selectedUserId, departments)
      setAccounts(current => current.map(account => account.user_id === selectedUserId ? { ...account, departamentos: departments } : account))
      notify.success("Áreas actualizadas")
    } catch {
      notify.error("No se pudieron guardar las áreas")
    } finally {
      setSaving(false)
    }
  }

  const addEmployee = async (employee: AssignableEmployee) => {
    if (!selectedUserId || assignedSet.has(employee.numero)) return
    setPendingNumber(employee.numero)
    try {
      await addAssignment(selectedUserId, employee.numero)
      setAssignedNumbers(current => [...current, employee.numero])
      setAssignedEmployees(current => [...current, employee].sort(byName))
      notify.success("Persona asignada")
    } catch {
      notify.error("No se pudo asignar a la persona")
    } finally {
      setPendingNumber(null)
    }
  }

  const removeEmployee = async (number: string) => {
    if (!selectedUserId) return
    setPendingNumber(number)
    try {
      await removeAssignment(selectedUserId, number)
      setAssignedNumbers(current => current.filter(value => value !== number))
      setAssignedEmployees(current => current.filter(employee => employee.numero !== number))
      notify.success("Asignación eliminada")
    } catch {
      notify.error("No se pudo quitar la asignación")
    } finally {
      setPendingNumber(null)
    }
  }

  return {
    accounts, selectedAccount, selectedUserId, selectAccount, loadingAccounts,
    departmentOptions, departments, toggleDepartment, hasDepartmentChanges, saveDepartments, saving,
    query, setQuery, searchActive, searching, results,
    assignedNumbers, assignedEmployees, assignedSet, loadingAssignments, pendingNumber, busy,
    addEmployee, removeEmployee,
  }
}

export type EvaluatorAssignmentsState = ReturnType<typeof useEvaluatorAssignments>
