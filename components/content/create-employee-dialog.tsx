"use client"

import { useState, useEffect, type ReactNode } from "react"
import { DateTextInput } from "@/components/ui/date-text-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveShell, ModalHeader, ModalFooter } from "@/components/ui/responsive-shell"
import { fechasDeIngreso } from "@/lib/hooks/useNuevoIngreso"
import type { NuevoIngreso } from "@/lib/hooks"
import { CATALOGO_ORGANIZACIONAL, TURNOS, JEFES_DE_AREA_POR_DEPARTAMENTO } from "@/lib/catalogo"
import { EmployeeNumberInput, PersonNameInput } from "@/components/ui/employee-inputs"
import { notify } from "@/lib/notify"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { numeroEmpleadoEnUso } from "@/lib/validations/numero-empleado-en-uso"

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
  /** Guarda en Plantilla y crea su seguimiento de ingreso. */
  onCreate: (data: Omit<NuevoIngreso, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
}

export function CreateEmployeeDialog({ open, saving, onClose, onCreate }: CreateEmployeeDialogProps) {
  const [form, setForm] = useState<NuevoEmpleadoForm>(FORM_INICIAL)
  const [checking, setChecking] = useState(false)
  // Número repetido: el campo queda marcado hasta que se cambie.
  const [numeroRepetido, setNumeroRepetido] = useState(false)

  useEffect(() => {
    if (open) { setForm(FORM_INICIAL); setNumeroRepetido(false) }
  }, [open])

  const set = (key: keyof NuevoEmpleadoForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (key === 'numero') setNumeroRepetido(false)
  }

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
    if (!form.numero.trim()) { notify.error('Falta el número de empleado'); return }
    if (!form.nombre.trim()) { notify.error('Falta el nombre'); return }
    if (!form.departamento) { notify.error('Falta el departamento'); return }
    if (!form.area) { notify.error('Falta el área'); return }
    if (!form.puesto) { notify.error('Falta el puesto'); return }
    if (!form.turno) { notify.error('Falta el turno'); return }
    if (!form.fecha_ingreso.trim()) { notify.error('Falta la fecha de ingreso'); return }

    setChecking(true)
    try {
      const ocupadoPor = await numeroEmpleadoEnUso('nuevo_ingreso', form.numero.trim())
      if (ocupadoPor) {
        setNumeroRepetido(true)
        notify.error(`El número ${form.numero.trim()} ya está registrado`, { description: ocupadoPor })
        return
      }
    } catch (error) {
      notify.error(describeSupabaseError(error, 'No se pudo revisar el número'))
      return
    } finally {
      setChecking(false)
    }

    const fi = form.fecha_ingreso
    const data: Omit<NuevoIngreso, 'id' | 'created_at' | 'updated_at'> = {
      numero: form.numero.trim(),
      nombre: form.nombre.trim().toUpperCase(),
      puesto: form.puesto.trim() || null,
      departamento: form.departamento.trim() || null,
      area: form.area.trim() || null,
      turno: form.turno.trim() || null,
      fecha_ingreso: fi,
      curp: null,
      escolaridad: null,
      jefe_area: form.jefe_area.trim() || null,
      ...fechasDeIngreso(fi, form.departamento),
      eval_1_calificacion: null,
      eval_2_calificacion: null,
      eval_3_calificacion: null,
      tipo_contrato: 'A prueba',
      rg_rec_048: 'Pendiente',
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

          {/* Mismo orden y rejilla que Nuevo empleado de /plantilla. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="numero" label="Número de empleado" required>
              <EmployeeNumberInput id="numero" required aria-invalid={numeroRepetido || undefined} value={form.numero} onValueChange={value => set('numero', value)} />
            </FormField>
            <FormField id="fecha_ingreso" label="Fecha de ingreso" required>
              <DateTextInput id="fecha_ingreso" value={form.fecha_ingreso} onValueChange={fecha => set('fecha_ingreso', fecha)} />
            </FormField>

            <div className="min-w-0 sm:col-span-2">
              <FormField id="nombre" label="Nombre completo" required>
                <PersonNameInput id="nombre" value={form.nombre} onValueChange={value => set('nombre', value)} />
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
        saving={saving || checking}
        confirmDisabled={!form.numero.trim() || !form.nombre.trim()}
      />
    </ResponsiveShell>
  )
}
