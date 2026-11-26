"use client"

import { useState, useEffect, type ReactNode } from "react"
import { AlertCircle } from "lucide-react"
import { DateTextInput } from "@/components/ui/date-text-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveShell, ModalHeader, ModalFooter } from "@/components/ui/responsive-shell"
import { addDays } from "@/lib/hooks"
import type { NuevoIngreso } from "@/lib/hooks"
import { CATALOGO_ORGANIZACIONAL, TURNOS, JEFES_DE_AREA_POR_DEPARTAMENTO } from "@/lib/catalogo"

// ─────────────────────────────────────────────────────────────────────────────

interface FormFieldProps {
  id: string
  label: string
  required?: boolean
  children: ReactNode
}

function FormField({ id, label, required = false, children }: FormFieldProps) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <><span aria-hidden="true" className="text-destructive"> *</span><span className="sr-only"> (obligatorio)</span></>}
      </Label>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface NuevoEmpleadoForm {
  numero: string
  nombre: string
  puesto: string
  departamento: string
  area: string
  turno: string
  fecha_ingreso: string
  jefe_area: string
}

const FORM_INICIAL: NuevoEmpleadoForm = {
  numero: '', nombre: '', puesto: '', departamento: '', area: '',
  turno: '', fecha_ingreso: new Date().toISOString().split('T')[0],
  jefe_area: '',
}

// ─────────────────────────────────────────────────────────────────────────────

export interface CreateEmployeeDialogProps {
  open: boolean
  saving: boolean
  onClose: () => void
  onCreate: (data: Omit<NuevoIngreso, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
}

export function CreateEmployeeDialog({ open, saving, onClose, onCreate }: CreateEmployeeDialogProps) {
  const [form, setForm] = useState<NuevoEmpleadoForm>(FORM_INICIAL)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (open) { setForm(FORM_INICIAL); setFormError(null) }
  }, [open])

  const set = (key: keyof NuevoEmpleadoForm, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const departamentos = Object.keys(CATALOGO_ORGANIZACIONAL)
  const areasDisponibles = form.departamento ? (CATALOGO_ORGANIZACIONAL[form.departamento]?.areas || []) : []
  const puestosDisponibles = form.departamento ? (CATALOGO_ORGANIZACIONAL[form.departamento]?.puestos || []) : []

  const setDepartamento = (v: string) => {
    const jefe = JEFES_DE_AREA_POR_DEPARTAMENTO[v]?.[0] ?? ''
    setForm(prev => ({
      ...prev, departamento: v, area: '', puesto: '', jefe_area: jefe,
    }))
  }

  const handleCreate = async () => {
    if (!form.nombre.trim()) { setFormError('El nombre es obligatorio.'); return }
    if (!form.departamento) { setFormError('El departamento es obligatorio.'); return }
    if (!form.area) { setFormError('El área es obligatoria.'); return }
    if (!form.puesto) { setFormError('El puesto es obligatorio.'); return }
    if (!form.turno) { setFormError('El turno es obligatorio.'); return }
    if (!form.fecha_ingreso.trim()) { setFormError('La fecha de ingreso es obligatoria.'); return }
    setFormError(null)

    const fi = form.fecha_ingreso
    const data: Omit<NuevoIngreso, 'id' | 'created_at' | 'updated_at'> = {
      numero: form.numero.trim() || null,
      nombre: form.nombre.trim().toUpperCase(),
      puesto: form.puesto.trim() || null,
      departamento: form.departamento.trim() || null,
      area: form.area.trim() || null,
      turno: form.turno.trim() || null,
      fecha_ingreso: fi,
      curp: null,
      escolaridad: null,
      jefe_area: form.jefe_area.trim() || null,
      eval_1_fecha: addDays(fi, 30),
      eval_1_calificacion: null,
      eval_2_fecha: addDays(fi, 60),
      eval_2_calificacion: null,
      eval_3_fecha: addDays(fi, 80),
      eval_3_calificacion: null,
      termino_contrato: addDays(fi, 90),
      tipo_contrato: 'A prueba',
      rg_rec_048: 'Pendiente',
      fecha_vencimiento_rg: form.departamento.trim().toUpperCase() === 'CALIDAD' ? addDays(fi, 7) : addDays(fi, 60),
      fecha_nacimiento: null,
      email: null,
      cumple_enviado_year: null,
    }
    await onCreate(data)
  }

  return (
    <ResponsiveShell
      open={open}
      onClose={onClose}
      size="sm"
      title="Nuevo empleado"
      description="Formulario para registrar a un nuevo trabajador en el sistema."
    >
      <ModalHeader title="Nuevo empleado" onClose={onClose} />

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-4 p-(--card-padding)">
          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {/* Mismo orden y rejilla que Nuevo empleado de /plantilla. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="numero" label="Número de empleado">
              <Input id="numero" inputMode="numeric" value={form.numero} onChange={e => set('numero', e.target.value)} />
            </FormField>
            <FormField id="fecha_ingreso" label="Fecha de ingreso" required>
              <DateTextInput id="fecha_ingreso" value={form.fecha_ingreso} onValueChange={fecha => set('fecha_ingreso', fecha)} />
            </FormField>

            <div className="min-w-0 sm:col-span-2">
              <FormField id="nombre" label="Nombre completo" required>
                <Input id="nombre" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
              </FormField>
            </div>

            <FormField id="departamento" label="Departamento" required>
              <Select value={form.departamento} onValueChange={setDepartamento}>
                <SelectTrigger id="departamento"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent className="max-h-56">
                  {departamentos.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="area" label="Área" required>
              <Select value={form.area} onValueChange={v => set('area', v)} disabled={!form.departamento}>
                <SelectTrigger id="area"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent className="max-h-56">
                  {areasDisponibles.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>

            <FormField id="puesto" label="Puesto" required>
              <Select value={form.puesto} onValueChange={v => set('puesto', v)} disabled={!form.departamento}>
                <SelectTrigger id="puesto"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent className="max-h-56">
                  {puestosDisponibles.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="turno" label="Turno" required>
              <Select value={form.turno} onValueChange={v => set('turno', v)}>
                <SelectTrigger id="turno"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent className="max-h-56">
                  {TURNOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>

            {/* Se llena solo con el departamento. */}
            <FormField id="jefe_area" label="Jefe de área">
              <Input id="jefe_area" readOnly value={form.jefe_area} placeholder="Según el departamento" title={form.jefe_area || undefined} />
            </FormField>
          </div>
        </div>
      </div>
      <ModalFooter
        onCancel={onClose}
        onConfirm={handleCreate}
        saving={saving}
        confirmDisabled={!form.nombre.trim()}
      />
    </ResponsiveShell>
  )
}
