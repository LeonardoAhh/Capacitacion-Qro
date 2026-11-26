"use client"

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CompactPager } from "@/components/ui/compact-pager"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
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

const PAGE_SIZE = 9
const HEAD = "whitespace-nowrap text-eyebrow uppercase"

interface RegistrosPorDiaPageProps {
  config: RegistroPorDiaConfig
  numeroEmpleado: string
}

/** Ficha de un empleado con sus registros por mes y día; captura individual para dev. */
export function RegistrosPorDiaPage({ config, numeroEmpleado }: RegistrosPorDiaPageProps) {
  const { canCapturePlantilla } = useRole()
  const { loading, saving, error, fetchByEmpleado, reloadByEmpleado, saveForEmpleadoDia } = useRegistrosPorDia(config)
  const [records, setRecords] = useState<RegistroPorDia[]>([])
  const [nombreEmpleado, setNombreEmpleado] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(today)
  const [formCount, setFormCount] = useState("1")
  const [formMinutes, setFormMinutes] = useState("0")
  const [formError, setFormError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const newRecordRef = useRef<HTMLButtonElement>(null)

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

  /** Total por mes; las filas se paginan por día y cada mes abre su grupo. */
  const monthTotals = useMemo(() => {
    const totals = new Map<string, ValoresDia>()
    for (const { mes, cantidad, minutos } of records) {
      const current = totals.get(mes) ?? { cantidad: 0, minutos: 0 }
      totals.set(mes, { cantidad: current.cantidad + cantidad, minutos: current.minutos + (minutos ?? 0) })
    }
    return totals
  }, [records])
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const columns = config.conMinutos ? 3 : 2

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
    <div className="space-y-4">
      {/* Barra única: empleado a la izquierda; captura y página a la derecha. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0">
          {nombreEmpleado ? <p className="truncate text-label-sm text-foreground">{nombreEmpleado}</p> : <Skeleton className="mb-1 h-4 w-48" />}
          <p className="text-body-sm tabular-nums text-muted-foreground">#{numeroEmpleado}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {canCapturePlantilla && (
            <Button ref={newRecordRef} type="button" size="sm" className="touch-target" onClick={openForm}>
              <Plus aria-hidden="true" />
              Nuevo {config.singular}
            </Button>
          )}
          <CompactPager label={`Paginación de ${config.plural}`} page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {loading ? (
        <div role="status" aria-label={`Cargando ${config.plural}`} className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} aria-hidden="true" className="h-(--control-height) w-full" />)}
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-(--card-padding) py-3">
          <p className="text-body-md text-destructive">{error}</p>
          <Button type="button" variant="outline" size="sm" className="touch-target" onClick={() => void load()}>Reintentar</Button>
        </div>
      ) : records.length === 0 ? (
        <p className="rounded-xl border border-dashed px-(--card-padding) py-12 text-center text-body-md text-muted-foreground">
          No hay días con {config.plural} para este empleado.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table className="table-fixed">
            <caption className="sr-only">{capitalize(config.plural)} de {nombreEmpleado ?? `#${numeroEmpleado}`} por día</caption>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col" className={HEAD}>Día</TableHead>
                <TableHead scope="col" className={cn(HEAD, "w-32 text-right")}>Cantidad</TableHead>
                {config.conMinutos && <TableHead scope="col" className={cn(HEAD, "w-32 text-right")}>Minutos</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((record, index) => {
                const opensMonth = index === 0 || pageRows[index - 1].mes !== record.mes
                const total = monthTotals.get(record.mes)
                return (
                  <Fragment key={recordDate(record)}>
                    {opensMonth && total && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead scope="colgroup" colSpan={columns} className="h-auto py-2">
                          <span className="flex items-baseline justify-between gap-4">
                            <span className="text-label-sm text-foreground">{formatMonth(record.mes)}</span>
                            <span className="text-body-sm font-normal tabular-nums text-muted-foreground">{describe(total)}</span>
                          </span>
                        </TableHead>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell className="text-label-sm tabular-nums text-foreground">
                        <time dateTime={recordDate(record)}>Día {record.dia}</time>
                      </TableCell>
                      <TableCell className="text-right text-body-sm tabular-nums text-muted-foreground">{record.cantidad}</TableCell>
                      {config.conMinutos && <TableCell className="text-right text-body-sm tabular-nums text-muted-foreground">{record.minutos ?? 0}</TableCell>}
                    </TableRow>
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {canCapturePlantilla && (
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
