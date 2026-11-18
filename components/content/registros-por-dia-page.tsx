"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { FileQuestion, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useRole } from "@/lib/hooks"
import { notify } from "@/lib/notify"
import { supabase } from "@/lib/supabase/client"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { useRegistrosPorDia } from "@/lib/hooks/useRegistrosPorDia"
import {
  capitalize, formatCount, formatMinutes, formatMonth, isValidDate, MAX_CANTIDAD, recordDate, sortRecords, today,
  type RegistroPorDia, type RegistroPorDiaConfig, type ValoresDia,
} from "@/lib/plantilla/registros-por-dia"
import { RegistroPorDiaFormDialog } from "@/components/content/registros-por-dia-form-dialog"

interface RegistrosPorDiaPageProps {
  config: RegistroPorDiaConfig
  numeroEmpleado: string
}

/** Ficha de un empleado con sus registros por mes y día; captura individual para dev. */
export function RegistrosPorDiaPage({ config, numeroEmpleado }: RegistrosPorDiaPageProps) {
  const { canEdit } = useRole()
  const { loading, saving, error, fetchByEmpleado, reloadByEmpleado, saveForEmpleadoDia } = useRegistrosPorDia(config)
  const [records, setRecords] = useState<RegistroPorDia[]>([])
  const [nombreEmpleado, setNombreEmpleado] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(today)
  const [formCount, setFormCount] = useState("1")
  const [formMinutes, setFormMinutes] = useState("0")
  const [formError, setFormError] = useState<string | null>(null)
  const newRecordRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  const load = useCallback(async () => {
    setRecords(await reloadByEmpleado(numeroEmpleado))
  }, [numeroEmpleado, reloadByEmpleado])

  useEffect(() => {
    let active = true
    void fetchByEmpleado(numeroEmpleado).then(data => {
      if (active) setRecords(data)
    })
    supabase
      .from("employees")
      .select("nombre")
      .eq("numero", numeroEmpleado)
      .maybeSingle()
      .then(({ data, error: dbError }) => {
        if (!active) return
        if (dbError) {
          notify.error(describeSupabaseError(dbError, "Error al cargar el empleado"))
          return
        }
        setNombreEmpleado(data?.nombre ?? null)
      })
    return () => {
      active = false
    }
  }, [fetchByEmpleado, numeroEmpleado])

  const months = useMemo(() => {
    const grouped = new Map<string, RegistroPorDia[]>()
    for (const record of records) grouped.set(record.mes, [...(grouped.get(record.mes) ?? []), record])
    return [...grouped.entries()].map(([month, days]) => ({
      month,
      days,
      total: days.reduce((sum, day) => sum + day.cantidad, 0),
      totalMinutes: days.reduce((sum, day) => sum + (day.minutos ?? 0), 0),
    }))
  }, [records])

  const findByDate = (date: string) => records.find(record => recordDate(record) === date)
  const describe = ({ cantidad, minutos }: ValoresDia) =>
    config.conMinutos ? `${formatCount(cantidad, config)} (${formatMinutes(minutos)})` : formatCount(cantidad, config)
  const existingDateRecord = findByDate(formDate)

  const selectDate = (date: string) => {
    setFormDate(date)
    const existing = findByDate(date)
    setFormCount(String(existing?.cantidad ?? 1))
    setFormMinutes(String(existing?.minutos ?? 0))
    setFormError(null)
  }

  const openForm = () => {
    selectDate(today())
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!isValidDate(formDate)) {
      setFormError("Selecciona una fecha válida.")
      return
    }

    const cantidad = Number(formCount)
    if (!Number.isSafeInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) {
      setFormError("La cantidad debe ser un entero mayor que cero.")
      return
    }

    const minutos = config.conMinutos ? Number(formMinutes) : 0
    if (config.conMinutos && (!Number.isSafeInteger(minutos) || minutos < 0 || minutos > MAX_CANTIDAD)) {
      setFormError("Los minutos deben ser un entero mayor o igual a cero.")
      return
    }

    const existing = findByDate(formDate)
    const anterior: ValoresDia | null = existing ? { cantidad: existing.cantidad, minutos: existing.minutos ?? 0 } : null
    if (anterior && anterior.cantidad === cantidad && anterior.minutos === minutos) {
      setFormError(`Ya hay ${describe(anterior)} para esta fecha. Si hubo reincidencia, captura el nuevo total.`)
      return
    }

    if (anterior) {
      const confirmed = await notify.confirm({
        title: "Actualizar registro del día",
        description: `Ya hay ${describe(anterior)} el ${formDate}. Confirma que el nuevo total sea ${describe({ cantidad, minutos })}.`,
        confirmLabel: "Actualizar",
        tone: "warning",
      })
      if (!confirmed) return
    }

    setFormError(null)
    const result = await saveForEmpleadoDia(numeroEmpleado, formDate, { cantidad, minutos }, anterior)
    if (!result.success) {
      setFormError(result.error)
      void load()
      return
    }

    const [year, month, day] = formDate.split("-")
    setRecords(current => sortRecords([
      ...current.filter(record => recordDate(record) !== formDate),
      { numero_empleado: numeroEmpleado, mes: `${year}-${month}`, dia: Number(day), cantidad, ...(config.conMinutos ? { minutos } : {}) },
    ]))
    setShowForm(false)
    notify.success(anterior ? "Registro actualizado." : `${capitalize(config.singular)} capturado.`)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-body-sm tabular-nums text-muted-foreground">Núm. {numeroEmpleado}</p>
          <h2 className="break-words text-heading-md text-foreground">{nombreEmpleado ?? "Empleado"}</h2>
          <p className="text-body-md text-muted-foreground">{config.descripcion}</p>
        </div>
        {canEdit && (
          <Button ref={newRecordRef} type="button" size="sm" className="pl-2 pr-3" onClick={openForm}>
            <Plus aria-hidden="true" />
            Nuevo {config.singular}
          </Button>
        )}
      </header>

      <section aria-labelledby={titleId} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id={titleId} className="text-label-sm text-foreground">Meses con {config.plural}</h3>
          {!loading && months.length > 0 && (
            <Badge variant="outline" className="font-medium text-muted-foreground">
              {months.length} {months.length === 1 ? "mes" : "meses"}
            </Badge>
          )}
        </div>

        {loading ? (
          <div role="status" aria-busy="true" className="grid gap-4 lg:grid-cols-2">
            <span className="sr-only">Cargando {config.plural}</span>
            {[0, 1].map(item => <Skeleton key={item} aria-hidden="true" className="h-32 w-full rounded-xl" />)}
          </div>
        ) : error ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4">
            <p className="text-body-md text-destructive">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>Reintentar</Button>
          </div>
        ) : months.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-4 py-8 text-center">
            <FileQuestion className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-label-sm text-foreground">Sin {config.plural}</p>
            <p className="text-body-sm text-muted-foreground">No hay días con registros para este empleado.</p>
          </div>
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {months.map(({ month, days, total, totalMinutes }) => (
              <section key={month} aria-label={formatMonth(month)} className="rounded-xl border border-border bg-card p-4">
                <header className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="text-label-sm text-foreground">{formatMonth(month)}</h4>
                  <p className="text-body-sm tabular-nums text-muted-foreground">
                    {config.conMinutos ? describe({ cantidad: total, minutos: totalMinutes }) : formatCount(total, config)}
                  </p>
                </header>
                <ul className="divide-y divide-border">
                  {days.map(({ dia, cantidad, minutos }) => (
                    <li key={dia} className="flex items-center justify-between gap-4 py-2">
                      <span className="text-body-md text-foreground">Día {dia}</span>
                      <span className="text-body-sm tabular-nums text-muted-foreground">{describe({ cantidad, minutos: minutos ?? 0 })}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      {canEdit && (
        <RegistroPorDiaFormDialog
          config={config}
          open={showForm}
          onOpenChange={open => {
            setShowForm(open)
            if (!open) setFormError(null)
          }}
          saving={saving}
          date={formDate}
          count={formCount}
          minutes={formMinutes}
          existing={existingDateRecord ? { cantidad: existingDateRecord.cantidad, minutos: existingDateRecord.minutos ?? 0 } : null}
          employeeName={nombreEmpleado ?? "Empleado"}
          employeeNumber={numeroEmpleado}
          error={formError}
          onDateChange={selectDate}
          onCountChange={setFormCount}
          onMinutesChange={setFormMinutes}
          onSave={handleSave}
          onReturnFocus={() => newRecordRef.current?.focus()}
        />
      )}
    </div>
  )
}
