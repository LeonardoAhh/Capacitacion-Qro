"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { formatDate } from "@/lib/hooks"
import type { EstadoRG, NuevoIngreso, NuevoIngresoUpdate, TipoContrato } from "@/lib/hooks"
import { CATALOGO_ORGANIZACIONAL, TURNOS } from "@/lib/catalogo"

export interface EditEmployeeDialogProps {
  record: NuevoIngreso | null
  open: boolean
  saving: boolean
  onClose: () => void
  onSave: (id: string, updates: NuevoIngresoUpdate) => Promise<void>
}

export function EditEmployeeDialog({ record, open, saving, onClose, onSave }: EditEmployeeDialogProps) {
  const [form, setForm] = useState<NuevoIngresoUpdate>({})

  useEffect(() => {
    if (record) {
      setForm({
        departamento: record.departamento ?? "",
        area: record.area ?? "",
        puesto: record.puesto ?? "",
        turno: record.turno ?? "",
        tipo_contrato: record.tipo_contrato,
        rg_rec_048: record.rg_rec_048,
      })
    }
  }, [record])

  if (!record) return null

  const departamento = form.departamento ?? ""
  const catalogoDepartamento = CATALOGO_ORGANIZACIONAL[departamento]
  const areasDisponibles = catalogoDepartamento?.areas ?? []
  const puestosDisponibles = catalogoDepartamento?.puestos ?? []

  const handleClose = () => {
    if (!saving) onClose()
  }

  const setDepartamento = (value: string) => {
    const catalogo = CATALOGO_ORGANIZACIONAL[value]
    setForm(prev => ({
      ...prev,
      departamento: value,
      area: catalogo?.areas.includes(prev.area ?? "") ? prev.area : null,
    }))
  }

  const set = (key: keyof NuevoIngresoUpdate, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value === "" ? null : value }))

  const meta = [
    record.numero && `#${record.numero}`,
    record.fecha_ingreso && `Ingreso ${formatDate(record.fecha_ingreso)}`,
  ].filter(Boolean).join(" · ")

  return (
    <ResponsiveShell
      open={open}
      onClose={handleClose}
      size="sm"
      title={record.nombre}
      description={`${record.puesto} · ${record.departamento}`}
    >
      <ModalHeader
        title={record.nombre}
        subtitle={`${record.puesto} · ${record.departamento}`}
        onClose={handleClose}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-card px-4 py-4 sm:px-6">
        <div className="space-y-4">
          {meta && (
            <p className="text-body-sm tabular-nums text-muted-foreground">{meta}</p>
          )}

          {/* Departamento y Área */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="edit-departamento">Departamento</Label>
              <Select value={departamento} onValueChange={setDepartamento} disabled={saving}>
                <SelectTrigger id="edit-departamento"><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent className="max-h-56">
                  {Object.keys(CATALOGO_ORGANIZACIONAL).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  {departamento && !catalogoDepartamento && <SelectItem value={departamento}>{departamento}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="edit-area">Área</Label>
              <Select value={form.area ?? ""} onValueChange={v => set("area", v)} disabled={saving || !departamento}>
                <SelectTrigger id="edit-area"><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent className="max-h-56">
                  {areasDisponibles.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  {form.area && !areasDisponibles.includes(form.area) && <SelectItem value={form.area}>{form.area}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Puesto y Turno */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="edit-puesto">Puesto</Label>
              <Select value={form.puesto ?? ""} onValueChange={v => set("puesto", v)} disabled={saving}>
                <SelectTrigger id="edit-puesto"><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent className="max-h-56">
                  {puestosDisponibles.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  {form.puesto && !puestosDisponibles.includes(form.puesto) && <SelectItem value={form.puesto}>{form.puesto}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="edit-turno">Turno</Label>
              <Select value={form.turno ?? ""} onValueChange={v => set("turno", v)} disabled={saving}>
                <SelectTrigger id="edit-turno"><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>
                  {TURNOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contrato y RG-REC-048 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="edit-contrato">Tipo de contrato</Label>
              <Select value={form.tipo_contrato ?? record.tipo_contrato} onValueChange={v => set("tipo_contrato", v as TipoContrato)} disabled={saving}>
                <SelectTrigger id="edit-contrato"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A prueba">A prueba</SelectItem>
                  <SelectItem value="Indeterminado">Indeterminado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="edit-rg">RG-REC-048</Label>
              <Select value={form.rg_rec_048 ?? record.rg_rec_048} onValueChange={v => set("rg_rec_048", v as EstadoRG)} disabled={saving}>
                <SelectTrigger id="edit-rg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="Entregado">Entregado</SelectItem>
                </SelectContent>
              </Select>
              {record.fecha_vencimiento_rg && (
                <p className="text-body-sm tabular-nums text-muted-foreground">
                  Vence {formatDate(record.fecha_vencimiento_rg)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ModalFooter
        onCancel={handleClose}
        onConfirm={() => { void onSave(record.id, form) }}
        confirmLabel={saving ? "Guardando…" : "Guardar"}
        saving={saving}
      />
    </ResponsiveShell>
  )
}
