"use client"

import { useRef, useState, type ReactNode } from "react"
import { Pencil, Plus, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DateTextInput } from "@/components/ui/date-text-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { notify } from "@/lib/notify"
import { DncNeedsTable } from "@/components/content/dnc-needs-table"
import { DncPrint } from "@/components/content/dnc-print"
import { nombreDepartamento, responsablesDnc, type CambiosEncabezadoDnc, type DncNecesidad, type DncPosition, type DncReporte } from "@/lib/dnc"

interface DncReportProps {
  reporte: DncReporte
  necesidades: DncNecesidad[]
  puestos: DncPosition[]
  canEdit: boolean
  /** Año, departamento y Crear DNC: comparten la fila de acciones del encabezado. */
  filtros: ReactNode
  onSaveHeader: (cambios: CambiosEncabezadoDnc) => Promise<void>
  onAdd: () => void
  onEdit: (necesidad: DncNecesidad) => void
  onDelete: (necesidad: DncNecesidad) => void
}

function formatFecha(value: string | null): string {
  return value ? value.split("-").reverse().join("/") : "Sin capturar"
}

const MODIFICACION_FORMAT = new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" })

function formatModificacion(value: string | null | undefined): string | null {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? MODIFICACION_FORMAT.format(date) : null
}

type CampoEncabezado = keyof CambiosEncabezadoDnc

const MENSAJE_REQUERIDO: Record<CampoEncabezado, string> = {
  responsable_nombre: "Indica el nombre del responsable de área.",
  fecha_elaboracion: "Indica la fecha de elaboración.",
}

export function DncReport({ reporte, necesidades, puestos, canEdit, filtros, onSaveHeader, onAdd, onEdit, onDelete }: DncReportProps) {
  const [nombre, setNombre] = useState(reporte.responsable_nombre ?? "")
  const [fecha, setFecha] = useState(reporte.fecha_elaboracion ?? "")
  // Jefes del departamento; un responsable guardado que ya no esté en el catálogo se conserva como opción.
  const catalogo = responsablesDnc(nombreDepartamento(reporte))
  const responsables = reporte.responsable_nombre && !catalogo.includes(reporte.responsable_nombre)
    ? [reporte.responsable_nombre, ...catalogo]
    : catalogo
  const [savingField, setSavingField] = useState<CampoEncabezado | null>(null)
  const setters: Record<CampoEncabezado, (value: string) => void> = { responsable_nombre: setNombre, fecha_elaboracion: setFecha }

  const modificacion = formatModificacion(reporte.updated_at)
  const headerComplete = Boolean(reporte.responsable_nombre && reporte.fecha_elaboracion)
  // Capturado = solo lectura; se edita a propósito con "Editar". Si falta un dato, abre en edición.
  const [editing, setEditing] = useState(canEdit && !headerComplete)
  const firstFieldRef = useRef<HTMLButtonElement>(null)
  const editButtonRef = useRef<HTMLButtonElement>(null)

  function startEditing() {
    setNombre(reporte.responsable_nombre ?? "")
    setFecha(reporte.fecha_elaboracion ?? "")
    setEditing(true)
    requestAnimationFrame(() => firstFieldRef.current?.focus())
  }

  function finishEditing() {
    // El blur de la fecha guarda antes de cerrar; "Listo" solo cambia la vista.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    setEditing(false)
    requestAnimationFrame(() => editButtonRef.current?.focus())
  }

  // Guardado automático al salir del campo: solo si cambió respecto a lo guardado.
  async function saveField(field: CampoEncabezado, raw: string) {
    const value = raw.trim()
    const saved = reporte[field] ?? ""
    if (value === saved) return
    if (!value) {
      setters[field](saved)
      notify.error(MENSAJE_REQUERIDO[field])
      return
    }
    setSavingField(field)
    try {
      await onSaveHeader({ [field]: value })
    } catch (cause) {
      setters[field](saved)
      notify.error(cause instanceof Error ? cause.message : "No se pudo guardar el cambio.")
    } finally {
      setSavingField(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* El título del reporte vive en el header de la página. */}
      <div className="grid gap-3">
        <div className="flex flex-wrap items-end gap-3">
          {editing ? (
            <form className="flex w-full flex-wrap items-end gap-3 sm:w-auto"
              onSubmit={event => {
                event.preventDefault()
                finishEditing()
              }}>
              <div className="grid w-full min-w-0 gap-2 sm:w-80">
                <Label htmlFor="dnc-responsable">Responsable de área</Label>
                <Select value={nombre}
                  onValueChange={value => {
                    setNombre(value)
                    void saveField("responsable_nombre", value)
                  }}>
                  <SelectTrigger ref={firstFieldRef} id="dnc-responsable" aria-busy={savingField === "responsable_nombre" || undefined}>
                    <SelectValue placeholder="Selecciona al responsable" />
                  </SelectTrigger>
                  <SelectContent matchTriggerWidth>
                    {responsables.map(responsable => (
                      <SelectItem key={responsable} value={responsable}>{responsable}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid w-full min-w-0 gap-2 sm:w-48">
                <Label htmlFor="dnc-fecha">Fecha de elaboración</Label>
                {/* Al salir se guarda la fecha ya convertida (AAAA-MM-DD), no el texto del campo. */}
                <DateTextInput id="dnc-fecha" value={fecha} onValueChange={setFecha}
                  onBlur={() => void saveField("fecha_elaboracion", fecha)}
                  aria-busy={savingField === "fecha_elaboracion" || undefined} />
              </div>
              {headerComplete && (
                <Button type="submit" variant="outline">Listo</Button>
              )}
            </form>
          ) : (
            // Vista de solo lectura: deja claro que el encabezado ya está capturado y cuándo se modificó.
            <dl className="flex min-h-(--control-height) flex-wrap items-end gap-x-8 gap-y-2">
              <div className="grid gap-1">
                <dt className="text-body-sm text-muted-foreground">Responsable de área</dt>
                <dd className="text-label-sm text-foreground">{reporte.responsable_nombre || "Sin capturar"}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-body-sm text-muted-foreground">Fecha de elaboración</dt>
                <dd className="text-label-sm tabular-nums text-foreground">{formatFecha(reporte.fecha_elaboracion)}</dd>
              </div>
              {modificacion && (
                <div className="grid gap-1">
                  <dt className="text-body-sm text-muted-foreground">Última modificación</dt>
                  <dd className="text-body-md tabular-nums text-muted-foreground">{modificacion}</dd>
                </div>
              )}
              {canEdit && (
                <Button ref={editButtonRef} type="button" variant="ghost" size="icon" className="text-muted-foreground"
                  aria-label="Editar responsable y fecha" onClick={startEditing}>
                  <Pencil aria-hidden="true" />
                </Button>
              )}
            </dl>
          )}
          {/* Una sola fila: encabezado a la izquierda; filtros y acciones a la derecha. */}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {filtros}
            <Button type="button" variant="outline" onClick={() => window.print()} disabled={necesidades.length === 0}>
              <Printer aria-hidden="true" />Imprimir
            </Button>
            {canEdit && (
              <Button type="button" onClick={onAdd}><Plus aria-hidden="true" />Agregar necesidad</Button>
            )}
          </div>
        </div>
      </div>

      <section aria-label="Necesidades de capacitación">
        <Card className="overflow-hidden">
          <DncNeedsTable necesidades={necesidades} puestos={puestos} departmentName={nombreDepartamento(reporte)} anio={reporte.anio}
            canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />
        </Card>
      </section>

      <DncPrint reporte={reporte} necesidades={necesidades} puestos={puestos} departamento={nombreDepartamento(reporte)} />
    </div>
  )
}
