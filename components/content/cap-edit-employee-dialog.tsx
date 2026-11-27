"use client"

import { useState, useEffect, useId } from "react"
import { DateTextInput } from "@/components/ui/date-text-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveShell, ModalHeader, ModalFooter } from "@/components/ui/responsive-shell"
import { CATALOGO_ORGANIZACIONAL, TURNOS, JEFES_DE_AREA } from "@/lib/catalogo"
import type { Employee } from "@/lib/hooks"
import { PersonNameInput } from "@/components/ui/employee-inputs"
import { notify } from "@/lib/notify"

export interface EditEmployeeForm {
  nombre: string
  departamento: string
  area: string
  puesto: string
  turno: string
  fecha_ingreso: string
  jefe_directo: string
  evaluacion_desempeno: string
}

export interface CapEditEmployeeDialogProps {
  employee: Employee | null
  open: boolean
  saving: boolean
  isReadOnly: boolean
  onClose: () => void
  onSave: (form: EditEmployeeForm) => void
}

export function CapEditEmployeeDialog({ employee, open, saving, isReadOnly, onClose, onSave }: CapEditEmployeeDialogProps) {
  const fieldId = useId()
  const [form, setForm] = useState<EditEmployeeForm>({ nombre: '', departamento: '', area: '', puesto: '', turno: '', fecha_ingreso: '', jefe_directo: '', evaluacion_desempeno: '' })

  useEffect(() => {
    if (employee) {
      setForm({
        nombre: employee.nombre,
        departamento: employee.departamento ?? '',
        area: employee.area ?? '',
        puesto: employee.puesto ?? '',
        turno: employee.turno ?? '',
        fecha_ingreso: employee.fecha_ingreso ?? '',
        jefe_directo: employee.jefe_directo ?? '',
        evaluacion_desempeno: employee.evaluacion_desempeno ?? '',
      })
    }
  }, [employee])

  if (!employee) return null

  const areas = form.departamento ? (CATALOGO_ORGANIZACIONAL[form.departamento]?.areas ?? []) : []
  const puestos = form.departamento ? (CATALOGO_ORGANIZACIONAL[form.departamento]?.puestos ?? []) : []

  const handleConfirm = () => {
    if (!form.nombre.trim()) { notify.error('Falta el nombre'); return }
    onSave(form)
  }

  return (
    <ResponsiveShell open={open} onClose={onClose} title="Editar empleado" description={`Modifica los datos de ${employee.nombre}`}>
      <ModalHeader title="Editar empleado" onClose={onClose} />

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-4 p-(--card-padding)">

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor={`${fieldId}-numero`}>Número de empleado</Label>
              <Input id={`${fieldId}-numero`} value={employee.numero ?? ""} readOnly />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor={`${fieldId}-fecha`}>Fecha de ingreso</Label>
              <DateTextInput id={`${fieldId}-fecha`} value={form.fecha_ingreso} onValueChange={fecha_ingreso => setForm(f => ({ ...f, fecha_ingreso }))} className="min-w-0" />
            </div>

            <div className="min-w-0 space-y-2 sm:col-span-2">
              <Label htmlFor={`${fieldId}-nombre`}>
                Nombre completo <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only"> (obligatorio)</span>
              </Label>
              <PersonNameInput id={`${fieldId}-nombre`} value={form.nombre} onValueChange={nombre => setForm(f => ({ ...f, nombre }))} required />
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor={`${fieldId}-departamento`}>Departamento</Label>
              <Select value={form.departamento} onValueChange={v => setForm(f => ({ ...f, departamento: v, area: '', puesto: '' }))}>
                <SelectTrigger id={`${fieldId}-departamento`}><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {Object.keys(CATALOGO_ORGANIZACIONAL).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor={`${fieldId}-area`}>Área</Label>
              <Select value={form.area} onValueChange={v => setForm(f => ({ ...f, area: v }))} disabled={areas.length === 0}>
                <SelectTrigger id={`${fieldId}-area`}><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor={`${fieldId}-puesto`}>Puesto</Label>
              <Select value={form.puesto} onValueChange={v => setForm(f => ({ ...f, puesto: v }))} disabled={puestos.length === 0}>
                <SelectTrigger id={`${fieldId}-puesto`}><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {puestos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor={`${fieldId}-turno`}>Turno</Label>
              <Select value={form.turno} onValueChange={v => setForm(f => ({ ...f, turno: v }))}>
                <SelectTrigger id={`${fieldId}-turno`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TURNOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor={`${fieldId}-jefe`}>Jefe directo</Label>
              <Select value={form.jefe_directo} onValueChange={v => setForm(f => ({ ...f, jefe_directo: v }))}>
                <SelectTrigger id={`${fieldId}-jefe`}><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {JEFES_DE_AREA.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor={`${fieldId}-evaluacion`}>Evaluación de desempeño</Label>
              <Input
                id={`${fieldId}-evaluacion`}
                type="number" inputMode="numeric" min={0} max={99}
                className="tabular-nums" placeholder="0 a 99"
                value={form.evaluacion_desempeno}
                onChange={e => { const v = e.target.value.slice(0, 2); setForm(f => ({ ...f, evaluacion_desempeno: v })) }}
              />
            </div>
          </div>
        </div>
      </div>
      <ModalFooter
        onCancel={onClose}
        onConfirm={handleConfirm}
        saving={saving}
        confirmDisabled={isReadOnly}
      />
    </ResponsiveShell>
  )
}
