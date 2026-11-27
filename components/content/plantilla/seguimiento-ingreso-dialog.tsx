"use client"

import { useState, type ReactNode } from "react"
import { Trash2 } from "lucide-react"
import { ContratoTerminoCell, EvalCell } from "@/components/content/shared/eval-badges"
import { Label } from "@/components/ui/label"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { daysFromToday, formatDate } from "@/lib/hooks"
import type { EstadoRG, NuevoIngreso, NuevoIngresoUpdate, TipoContrato } from "@/lib/hooks"
import { cn } from "@/lib/utils"

/** Un dato del seguimiento: etiqueta arriba, valor abajo. */
function Dato({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="min-w-0 space-y-1">
      {htmlFor
        ? <Label htmlFor={htmlFor} className="text-body-sm text-muted-foreground">{label}</Label>
        : <p className="text-body-sm font-medium text-muted-foreground">{label}</p>}
      <div>{children}</div>
    </div>
  )
}

interface SeguimientoIngresoDialogProps {
  record: NuevoIngreso | null
  open: boolean
  saving: boolean
  /** Sin edición (Auxiliar): solo consulta. */
  readOnly: boolean
  onClose: () => void
  onSave: (id: string, updates: NuevoIngresoUpdate) => void
  onRemove: (record: NuevoIngreso) => void
}

/**
 * Se monta con `key` del registro: el formulario empieza con sus valores sin sincronizar estado.
 * Lo que la tabla de Plantilla no muestra de un nuevo ingreso: evaluaciones del 1er al 3er mes,
 * contrato y RG-REC-048. El contrato y el RG se cambian aquí; los datos de puesto, en Editar empleado.
 */
export function SeguimientoIngresoDialog({ record, open, saving, readOnly, onClose, onSave, onRemove }: SeguimientoIngresoDialogProps) {
  const [contrato, setContrato] = useState<TipoContrato>(record?.tipo_contrato ?? "A prueba")
  const [rg, setRg] = useState<EstadoRG>(record?.rg_rec_048 ?? "Pendiente")

  if (!record) return null

  const sinCambios = contrato === record.tipo_contrato && rg === record.rg_rec_048
  const rgDias = daysFromToday(record.fecha_vencimiento_rg)
  const rgVencido = rg !== "Entregado" && rgDias !== null && rgDias < 0
  const close = () => { if (!saving) onClose() }

  return (
    <ResponsiveShell open={open} onClose={close} size="sm" title={record.nombre} description="Seguimiento de ingreso">
      <ModalHeader title={record.nombre} onClose={close} />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="grid grid-cols-1 gap-4 p-(--card-padding) sm:grid-cols-3">
          <Dato label="Ingreso">
            <span className="block text-body-md tabular-nums text-foreground">{formatDate(record.fecha_ingreso)}</span>
          </Dato>
          <div className="sm:col-span-2">
            <Dato label="Jefe de área">
              <span className="block truncate text-body-md text-foreground">{record.jefe_area || "—"}</span>
            </Dato>
          </div>

          <Dato label="Eval. 1er mes">
            <EvalCell fecha={record.eval_1_fecha} calificacion={record.eval_1_calificacion} numeroEvaluacion={1} />
          </Dato>
          <Dato label="Eval. 2do mes">
            <EvalCell fecha={record.eval_2_fecha} calificacion={record.eval_2_calificacion} numeroEvaluacion={2} />
          </Dato>
          <Dato label="Eval. 3er mes">
            <EvalCell fecha={record.eval_3_fecha} calificacion={record.eval_3_calificacion} numeroEvaluacion={3} />
          </Dato>

          <div className="sm:col-span-3 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
            <Dato label="Contrato" htmlFor={readOnly ? undefined : "seguimiento-contrato"}>
              {readOnly ? (
                <ContratoTerminoCell tipo={record.tipo_contrato} fecha={record.termino_contrato} indeterminado={record.tipo_contrato === "Indeterminado"} />
              ) : (
                <>
                  <Select value={contrato} onValueChange={value => setContrato(value as TipoContrato)} disabled={saving}>
                    <SelectTrigger id="seguimiento-contrato"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A prueba">A prueba</SelectItem>
                      <SelectItem value="Indeterminado">Indeterminado</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="mt-1 block text-body-sm tabular-nums text-muted-foreground">Término {formatDate(record.termino_contrato)}</span>
                </>
              )}
            </Dato>
            <Dato label="RG-REC-048" htmlFor={readOnly ? undefined : "seguimiento-rg"}>
              {readOnly ? (
                <span className={cn("block text-body-md", rg === "Entregado" ? "text-success" : rgVencido ? "text-destructive" : "text-warning-deep")}>{rg}</span>
              ) : (
                <Select value={rg} onValueChange={value => setRg(value as EstadoRG)} disabled={saving}>
                  <SelectTrigger id="seguimiento-rg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="Entregado">Entregado</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <span className={cn("mt-1 block text-body-sm tabular-nums", rgVencido ? "text-destructive" : "text-muted-foreground")}>
                Vence {formatDate(record.fecha_vencimiento_rg)}
              </span>
            </Dato>
          </div>
        </div>
      </div>

      {readOnly ? (
        <ModalFooter onCancel={close} cancelLabel="Cerrar" />
      ) : (
        <ModalFooter
          onCancel={close}
          onConfirm={() => onSave(record.id, { tipo_contrato: contrato, rg_rec_048: rg })}
          confirmDisabled={sinCambios}
          saving={saving}
          secondaryAction={{
            label: "Quitar del seguimiento",
            icon: <Trash2 aria-hidden="true" />,
            variant: "ghost",
            onClick: () => onRemove(record),
          }}
        />
      )}
    </ResponsiveShell>
  )
}
