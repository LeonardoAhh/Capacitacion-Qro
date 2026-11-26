"use client"

import { useCallback, useEffect, useId, useState } from "react"
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { CATEGORY_META } from "@/lib/constants/incidencias"
import {
  formatMes, INCIDENCIA_CATEGORIES, useIncidencias,
  type IncidenciaCategory, type IncidenciaRecord,
} from "@/lib/hooks/useIncidencias"
import { supabase } from "@/lib/supabase/client"
import { notify } from "@/lib/notify"
import { registerUnsavedChangesGuard } from "@/lib/unsaved-changes"

function currentMonth(): string {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function shiftMonth(month: string, offset: number): string {
  const [year, number] = month.split("-").map(Number)
  const date = new Date(Date.UTC(year, number - 1 + offset, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

function emptyByCategory<T>(value: T): Record<IncidenciaCategory, T> {
  return Object.fromEntries(INCIDENCIA_CATEGORIES.map(category => [category, value])) as Record<IncidenciaCategory, T>
}

/** Captura mensual de incidencias de un empleado: cantidad por categoría y notas opcionales. */
export function IncidenciasPage({ numeroEmpleado }: { numeroEmpleado: string }) {
  const { loading, saving, error, fetchByEmpleado, saveMonth } = useIncidencias()
  const fieldId = useId()
  const formId = `${fieldId}-form`
  const [identity, setIdentity] = useState<{ nombre: string; puesto: string | null } | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [records, setRecords] = useState<IncidenciaRecord[]>([])
  const [values, setValues] = useState(() => emptyByCategory(0))
  const [notes, setNotes] = useState(() => emptyByCategory(""))
  const [dirty, setDirty] = useState(false)

  const loadRecords = useCallback(async () => {
    setRecords(await fetchByEmpleado(numeroEmpleado))
  }, [fetchByEmpleado, numeroEmpleado])

  useEffect(() => {
    void loadRecords()
    let active = true
    const loadIdentity = async () => {
      const employee = await supabase.from("employees").select("nombre,puesto").eq("numero", numeroEmpleado).maybeSingle()
      if (employee.data) {
        if (active) setIdentity(employee.data)
        return
      }
      const recentHire = await supabase.from("nuevo_ingreso").select("nombre,puesto").eq("numero", numeroEmpleado).limit(1)
      if (active) setIdentity(recentHire.data?.[0] ?? null)
    }
    void loadIdentity()
    return () => { active = false }
  }, [loadRecords, numeroEmpleado])

  useEffect(() => {
    const monthValues = emptyByCategory(0)
    const monthNotes = emptyByCategory("")
    for (const record of records) {
      if (record.mes !== selectedMonth || !INCIDENCIA_CATEGORIES.includes(record.categoria)) continue
      monthValues[record.categoria] = record.valor
      monthNotes[record.categoria] = record.notas ?? ""
    }
    setValues(monthValues)
    setNotes(monthNotes)
    setDirty(false)
  }, [records, selectedMonth])

  const total = Object.values(values).reduce((sum, value) => sum + value, 0)
  const notedCategories = INCIDENCIA_CATEGORIES.filter(category => values[category] > 0 || notes[category].trim())

  const changeValue = (category: IncidenciaCategory, raw: string) => {
    const value = raw === "" ? 0 : Number(raw)
    if (!Number.isInteger(value) || value < 0) return
    setValues(previous => ({ ...previous, [category]: value }))
    setDirty(true)
  }

  const changeNote = (category: IncidenciaCategory, note: string) => {
    setNotes(previous => ({ ...previous, [category]: note }))
    setDirty(true)
  }

  const save = async () => {
    if (!dirty) return
    const result = await saveMonth(numeroEmpleado, selectedMonth, values, notes)
    if (result.success) {
      setDirty(false)
      await loadRecords()
    }
  }

  const confirmDiscard = useCallback(() => notify.confirm({
    title: "Descartar cambios",
    description: "Los cambios de este mes no se han guardado.",
    confirmLabel: "Descartar",
    tone: "warning",
    size: "xs",
  }), [])

  // La guardia también cubre el título del header y la barra lateral.
  useEffect(() => {
    if (!dirty) return
    return registerUnsavedChangesGuard(confirmDiscard)
  }, [confirmDiscard, dirty])

  const selectMonth = async (month: string) => {
    if (month === selectedMonth || saving) return
    if (dirty && !(await confirmDiscard())) return
    setSelectedMonth(month)
  }

  return (
    <div className="space-y-4">
      {/* Barra única: empleado a la izquierda; mes y guardado a la derecha. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0">
          {identity ? <p className="truncate text-label-sm text-foreground">{identity.nombre}</p> : <Skeleton className="mb-1 h-4 w-48" />}
          <p className="truncate text-body-sm tabular-nums text-muted-foreground">
            #{numeroEmpleado}{identity?.puesto && ` · ${identity.puesto}`}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <nav aria-label="Cambiar mes" className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="text-muted-foreground" disabled={saving} onClick={() => void selectMonth(shiftMonth(selectedMonth, -1))} aria-label="Mes anterior">
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span aria-live="polite" className="min-w-32 text-center text-label-sm text-foreground">{formatMes(selectedMonth)}</span>
            <Button type="button" variant="ghost" size="icon" className="text-muted-foreground" disabled={saving} onClick={() => void selectMonth(shiftMonth(selectedMonth, 1))} aria-label="Mes siguiente">
              <ChevronRight aria-hidden="true" />
            </Button>
          </nav>
          <Button type="submit" form={formId} size="sm" className="touch-target" disabled={!dirty || saving || loading} aria-busy={saving || undefined}>
            {saving ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check aria-hidden="true" />}
            Guardar cambios
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-2" role="status" aria-label="Cargando incidencias">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-(--control-height) w-full" />)}
        </div>
      ) : (
        <form id={formId} onSubmit={event => { event.preventDefault(); void save() }} className="space-y-4">
          {/* Rejilla de 12 celdas (11 categorías + total): cabe en 2, 3 o 4 columnas sin huecos. */}
          <fieldset className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3 lg:grid-cols-4">
            <legend className="sr-only">Incidencias de {formatMes(selectedMonth)}</legend>
            {INCIDENCIA_CATEGORIES.map((category, index) => {
              const id = `${fieldId}-${index}`
              return (
                <div key={category} className="flex min-w-0 items-center justify-between gap-2 bg-card px-3 py-2 sm:gap-3 sm:px-4">
                  <Label htmlFor={id} className="min-w-0 truncate text-label-sm text-foreground">{CATEGORY_META[category].shortLabel}</Label>
                  <Input id={id} type="number" min={0} step={1} inputMode="numeric" value={values[category] || ""}
                    onChange={event => changeValue(category, event.target.value)} placeholder="0" disabled={saving}
                    className="w-16 shrink-0 text-center tabular-nums" />
                </div>
              )
            })}
            <div className="flex items-center justify-between gap-2 bg-muted/50 px-3 py-2 sm:gap-3 sm:px-4">
              <span className="text-label-sm text-foreground">Total</span>
              <output aria-live="polite" className="w-16 text-center text-label-sm tabular-nums text-foreground">{total}</output>
            </div>
          </fieldset>

          {/* Notas solo para las categorías con cantidad o con nota previa. */}
          {notedCategories.length > 0 && (
            <fieldset className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <legend className="mb-2 text-label-sm text-foreground">Notas</legend>
              {notedCategories.map(category => {
                const id = `${fieldId}-nota-${category}`
                return (
                  <div key={category} className="min-w-0 space-y-1.5">
                    <Label htmlFor={id} className="text-body-sm text-muted-foreground">{CATEGORY_META[category].shortLabel}</Label>
                    <Input id={id} value={notes[category]} onChange={event => changeNote(category, event.target.value)} placeholder="Nota opcional" disabled={saving} />
                  </div>
                )
              })}
            </fieldset>
          )}
        </form>
      )}
    </div>
  )
}
