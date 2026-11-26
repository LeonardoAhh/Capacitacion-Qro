"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DateTextInput } from "@/components/ui/date-text-input"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { Stepper } from "@/components/ui/stepper"
import { AutoHeight } from "@/components/ui/auto-height"
import { cn } from "@/lib/utils"
import {
  formatFechaHora, KANBAN_COLUMNAS, limpiarAlEscribir, normalizarTarjeta, normalizarTexto, KANBAN_PRIORIDADES, KANBAN_REPETICIONES, KANBAN_TIPOS, MAX_COLABORADORES, MAX_DESCRIPCION, MAX_TITULO, validarContenido, validarTarjeta,
  type DatosTarjeta, type KanbanEstado, type KanbanMiembro, type KanbanPlantilla, type KanbanPrioridad, type KanbanRepeticion, type KanbanTarjeta, type KanbanTipo,
} from "@/lib/kanban"

interface KanbanCardDialogProps {
  tarjeta: KanbanTarjeta | null
  /** Columna inicial para tarjetas nuevas. */
  estadoInicial: KanbanEstado
  /** Datos de partida para una tarjeta nueva (duplicar o desde otro módulo). */
  base?: DatosTarjeta | null
  /** La tarjeta nueva es copia de otra. */
  duplicando?: boolean
  miembros: KanbanMiembro[]
  /** Plantillas del equipo; solo se ofrecen al crear. */
  plantillas: KanbanPlantilla[]
  onClose: () => void
  onSave: (datos: DatosTarjeta) => Promise<void>
}

const SIN_ASIGNAR = "sin-asignar"
const SIN_PLANTILLA = "sin-plantilla"
const PASOS = ["Contenido", "Seguimiento"] as const
type Paso = 1 | 2
// Campo que recibe el foco al entrar a cada paso.
const PRIMER_CAMPO: Record<Paso, string> = { 1: "kanban-titulo", 2: "kanban-estado" }

const FIELD = "grid min-w-0 content-start gap-2"

interface ColaboradoresFieldProps {
  miembros: KanbanMiembro[]
  responsableId: string | null
  value: string[]
  onChange: (value: string[]) => void
}

/** Selección múltiple compacta: el disparador resume a quiénes se eligió. */
function ColaboradoresField({ miembros, responsableId, value, onChange }: ColaboradoresFieldProps) {
  const opciones = miembros.filter(miembro => miembro.user_id !== responsableId)
  const elegidos = opciones.filter(miembro => value.includes(miembro.user_id))
  const resumen = elegidos.length === 0 ? "Sin colaboradores"
    : elegidos.length <= 2 ? elegidos.map(miembro => miembro.nombre).join(", ")
    : `${elegidos.length} personas`
  const lleno = value.length >= MAX_COLABORADORES

  return (
    <div className={FIELD}>
      <Label htmlFor="kanban-colaboradores">Colaboradores <span className="font-normal text-muted-foreground">(opcional)</span></Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button id="kanban-colaboradores" type="button" variant="outline" disabled={!opciones.length}
            className="w-full justify-between px-3 font-normal">
            <span className={cn("truncate", !elegidos.length && "text-muted-foreground")}>{resumen}</span>
            <ChevronDown className="text-muted-foreground" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="max-h-60 w-[var(--radix-popover-trigger-width)] overflow-y-auto p-1">
          <ul aria-label="Colaboradores" className="grid">
            {opciones.map(miembro => {
              const checked = value.includes(miembro.user_id)
              const id = `kanban-colaborador-${miembro.user_id}`
              return (
                <li key={miembro.user_id}>
                  <label htmlFor={id}
                    className="flex min-h-(--menu-item-height) cursor-pointer items-center gap-3 rounded-md px-2 text-body-md text-foreground transition-colors hover:bg-muted has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                    <Checkbox id={id} checked={checked} disabled={!checked && lleno}
                      onCheckedChange={next => onChange(next === true
                        ? [...value, miembro.user_id]
                        : value.filter(item => item !== miembro.user_id))} />
                    <span className="truncate">{miembro.nombre}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function KanbanCardDialog({ tarjeta, estadoInicial, base = null, duplicando = false, miembros, plantillas, onClose, onSave }: KanbanCardDialogProps) {
  const [form, setForm] = useState<DatosTarjeta>(base ?? {
    tipo: tarjeta?.tipo ?? "actividad",
    estado: tarjeta?.estado ?? estadoInicial,
    prioridad: tarjeta?.prioridad ?? "media",
    responsable_id: tarjeta?.responsable_id ?? null,
    titulo: tarjeta?.titulo ?? "",
    descripcion: tarjeta?.descripcion ?? "",
    fecha_inicio: tarjeta?.fecha_inicio ?? null,
    fecha_limite: tarjeta?.fecha_limite ?? null,
    repeticion: tarjeta?.repeticion ?? "ninguna",
    colaboradores: tarjeta?.colaboradores ?? [],
  })
  const [plantillaId, setPlantillaId] = useState(SIN_PLANTILLA)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState<Paso>(1)
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Al abrir, el foco va al título del modal (ResponsiveShell); al cambiar de paso, a su primer campo.
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    document.getElementById(PRIMER_CAMPO[step])?.focus()
  }, [step])
  const nombreDe = (id: string | null) => miembros.find(miembro => miembro.user_id === id)?.nombre ?? "Usuario sin perfil"
  const title = tarjeta ? "Editar tarjeta" : duplicando ? "Duplicar tarjeta" : "Nueva tarjeta"

  function update<K extends keyof DatosTarjeta>(field: K, value: DatosTarjeta[K]) {
    setForm(current => ({ ...current, [field]: value }))
    setError(null)
  }

  /** Copia el contenido de la plantilla; estado, personas y fechas se definen en el paso 2. */
  function aplicarPlantilla(id: string) {
    setPlantillaId(id)
    const plantilla = plantillas.find(item => item.id === id)
    if (!plantilla) return
    const { tipo, prioridad, titulo, descripcion, repeticion } = plantilla
    setForm(current => ({ ...current, tipo, prioridad, titulo, descripcion, repeticion }))
    setError(null)
  }

  function goTo(next: Paso) {
    setError(null)
    setStep(next)
  }

  function handleContinue() {
    const datos = normalizarTarjeta(form)
    setForm(datos)
    const message = validarContenido(datos)
    if (message) {
      setError(message)
      return
    }
    goTo(2)
  }

  async function handleSave() {
    const datos = normalizarTarjeta(form)
    setForm(datos)
    const message = validarTarjeta(datos)
    if (message) {
      setError(message)
      return
    }
    setSaving(true)
    try {
      await onSave(datos)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la tarjeta.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <ResponsiveShell open onClose={onClose} size="sm" title={title}>
      <ModalHeader title={title} onClose={onClose} />
      <form className="grid min-h-0 gap-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 dense:px-4 dense:py-4"
        onSubmit={event => {
          event.preventDefault()
          if (step === 1) handleContinue()
          else void handleSave()
        }}>
        <Stepper steps={PASOS} current={step} />
        {/* El alto sigue al paso con transición: el modal no salta al cambiar de paso. */}
        <AutoHeight>
        {step === 1 ? (
          <div key="step-1" className="step-enter grid gap-4">
            {!tarjeta && !base && plantillas.length > 0 && (
              <div className={FIELD}>
                <Label htmlFor="kanban-plantilla">Plantilla <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <Select value={plantillaId} onValueChange={aplicarPlantilla}>
                  <SelectTrigger id="kanban-plantilla"><SelectValue /></SelectTrigger>
                  <SelectContent matchTriggerWidth className="max-h-60">
                    <SelectItem value={SIN_PLANTILLA}>En blanco</SelectItem>
                    {[...plantillas].sort((left, right) => left.nombre.localeCompare(right.nombre, "es"))
                      .map(plantilla => <SelectItem key={plantilla.id} value={plantilla.id}>{plantilla.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div role="group" aria-labelledby="kanban-tipo-label" className="grid gap-2">
              <p id="kanban-tipo-label" className="text-label-sm text-foreground">Tipo</p>
              <RadioGroup value={form.tipo} onValueChange={value => update("tipo", value as KanbanTipo)}
                aria-labelledby="kanban-tipo-label" className="grid grid-cols-2 gap-2">
                {KANBAN_TIPOS.map(opcion => (
                  <label key={opcion.tipo} htmlFor={`kanban-tipo-${opcion.tipo}`}
                    className="flex min-h-(--control-height) cursor-pointer items-center gap-3 rounded-md border border-border px-3 text-body-md text-foreground transition-colors hover:bg-muted has-[[data-state=checked]]:border-primary">
                    <RadioGroupItem id={`kanban-tipo-${opcion.tipo}`} value={opcion.tipo} />
                    {opcion.label}
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className={FIELD}>
              <Label htmlFor="kanban-titulo">Título</Label>
              <Input id="kanban-titulo" value={form.titulo} maxLength={MAX_TITULO} autoComplete="off"
                aria-invalid={Boolean(error) && step === 1}
                onChange={event => update("titulo", limpiarAlEscribir(event.target.value))}
                onBlur={event => update("titulo", normalizarTexto(event.target.value))} />
            </div>

            <div className={FIELD}>
              <Label htmlFor="kanban-descripcion">Descripción <span className="font-normal text-muted-foreground">(opcional)</span></Label>
              <Textarea id="kanban-descripcion" rows={2} className="min-h-(--control-height) resize-none field-sizing-content"
                value={form.descripcion} maxLength={MAX_DESCRIPCION}
                onChange={event => update("descripcion", limpiarAlEscribir(event.target.value, true))}
                onBlur={event => update("descripcion", normalizarTexto(event.target.value, true))} />
            </div>
          </div>
        ) : (
          <div key="step-2" className="step-enter grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={FIELD}>
                <Label htmlFor="kanban-estado">Estado</Label>
                <Select value={form.estado} onValueChange={value => update("estado", value as KanbanEstado)}>
                  <SelectTrigger id="kanban-estado"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KANBAN_COLUMNAS.map(columna => <SelectItem key={columna.estado} value={columna.estado}>{columna.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className={FIELD}>
                <Label htmlFor="kanban-prioridad">Prioridad</Label>
                <Select value={form.prioridad} onValueChange={value => update("prioridad", value as KanbanPrioridad)}>
                  <SelectTrigger id="kanban-prioridad"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KANBAN_PRIORIDADES.map(item => <SelectItem key={item.prioridad} value={item.prioridad}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className={FIELD}>
                <Label htmlFor="kanban-responsable">Responsable</Label>
                <Select value={form.responsable_id ?? SIN_ASIGNAR}
                  onValueChange={value => update("responsable_id", value === SIN_ASIGNAR ? null : value)}>
                  <SelectTrigger id="kanban-responsable"><SelectValue /></SelectTrigger>
                  <SelectContent matchTriggerWidth className="max-h-60">
                    <SelectItem value={SIN_ASIGNAR}>Sin asignar</SelectItem>
                    {miembros.map(miembro => <SelectItem key={miembro.user_id} value={miembro.user_id}>{miembro.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <ColaboradoresField miembros={miembros} responsableId={form.responsable_id}
                value={form.colaboradores.filter(id => id !== form.responsable_id)}
                onChange={value => update("colaboradores", value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className={FIELD}>
                <Label htmlFor="kanban-inicio">Inicio <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <DateTextInput id="kanban-inicio" value={form.fecha_inicio ?? ""}
                  onValueChange={fecha => update("fecha_inicio", fecha || null)} />
              </div>
              <div className={FIELD}>
                <Label htmlFor="kanban-limite">Fecha límite <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <DateTextInput id="kanban-limite" value={form.fecha_limite ?? ""}
                  aria-invalid={Boolean(error) && step === 2}
                  onValueChange={fecha => update("fecha_limite", fecha || null)} />
              </div>
            </div>

            {form.tipo === "recordatorio" && (
              <div className={FIELD}>
                <Label htmlFor="kanban-repeticion">Repetir</Label>
                <Select value={form.repeticion} onValueChange={value => update("repeticion", value as KanbanRepeticion)}>
                  <SelectTrigger id="kanban-repeticion"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KANBAN_REPETICIONES.map(item => <SelectItem key={item.repeticion} value={item.repeticion}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.repeticion !== "ninguna" && (
                  <p className="text-body-sm text-muted-foreground">Al concluir, se programa el siguiente automáticamente.</p>
                )}
              </div>
            )}
          </div>
        )}
        </AutoHeight>

        {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
        {tarjeta && (
          // Autoría registrada por la base de datos.
          <dl className="grid gap-1 border-t border-border pt-3 text-body-sm text-muted-foreground">
            <div className="flex flex-wrap gap-x-1">
              <dt>Creada por</dt>
              <dd className="text-foreground">{nombreDe(tarjeta.creado_por)}</dd>
              <dd className="tabular-nums">· {formatFechaHora(tarjeta.created_at)}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt>Última modificación</dt>
              <dd className="text-foreground">{nombreDe(tarjeta.actualizado_por)}</dd>
              <dd className="tabular-nums">· {formatFechaHora(tarjeta.updated_at)}</dd>
            </div>
          </dl>
        )}
        {/* Enter en un campo envía el formulario. */}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
      <ModalFooter onCancel={step === 1 ? onClose : () => goTo(1)} cancelLabel={step === 1 ? "Cancelar" : "Volver"}
        onConfirm={step === 1 ? handleContinue : () => void handleSave()} saving={saving}
        confirmLabel={step === 1 ? "Continuar" : tarjeta ? "Guardar cambios" : "Crear tarjeta"} />
    </ResponsiveShell>
  )
}
