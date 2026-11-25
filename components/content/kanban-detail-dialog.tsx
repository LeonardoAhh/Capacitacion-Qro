"use client"

import { useState } from "react"
import { HandHelping, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { ModalFooter, ModalHeader, ResponsiveShell } from "@/components/ui/responsive-shell"
import { cn } from "@/lib/utils"
import {
  KanbanApoyo, KanbanAvatar, KanbanBloqueo, KanbanFechas, KanbanPersonas, KanbanPrioridadFlag, KanbanTipoLabel,
} from "@/components/content/kanban-meta"
import {
  etiquetaEstado, formatHace, limpiarAlEscribir, MAX_COMENTARIO, MAX_PASO, MAX_PASOS, normalizarTexto,
  type KanbanComentario, type KanbanMiembro, type KanbanPaso, type KanbanTarjeta,
} from "@/lib/kanban"

interface KanbanDetailDialogProps {
  tarjeta: KanbanTarjeta
  miembros: Map<string, KanbanMiembro>
  pasos: KanbanPaso[]
  comentarios: KanbanComentario[]
  userId: string | null
  onClose: () => void
  onEdit: () => void
  onAgregarPaso: (texto: string) => Promise<void>
  onMarcarPaso: (paso: KanbanPaso, hecho: boolean) => void
  onEliminarPaso: (paso: KanbanPaso) => void
  onComentar: (texto: string) => Promise<void>
  onEliminarComentario: (comentario: KanbanComentario) => void
}

const SECTION_TITLE = "flex items-baseline gap-2 text-label-sm text-foreground"

function mensaje(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback
}

/** Pasos de la tarjeta: marcar, quitar y agregar sin salir del detalle. */
function Checklist({ tarjeta, pasos, onAgregar, onMarcar, onEliminar }: {
  tarjeta: KanbanTarjeta
  pasos: KanbanPaso[]
  onAgregar: (texto: string) => Promise<void>
  onMarcar: (paso: KanbanPaso, hecho: boolean) => void
  onEliminar: (paso: KanbanPaso) => void
}) {
  const [texto, setTexto] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const hechos = pasos.filter(paso => paso.hecho).length
  const lleno = pasos.length >= MAX_PASOS

  async function agregar() {
    const limpio = normalizarTexto(texto)
    if (!limpio) return
    setSaving(true)
    try {
      await onAgregar(limpio)
      setTexto("")
      setError(null)
    } catch (cause) {
      setError(mensaje(cause, "No se pudo agregar el paso."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="kanban-checklist" className="grid gap-2">
      <h3 id="kanban-checklist" className={SECTION_TITLE}>
        Checklist
        {pasos.length > 0 && <span className="text-body-sm font-normal tabular-nums text-muted-foreground">{hechos}/{pasos.length}</span>}
      </h3>
      {pasos.length > 0 && (
        <>
          <Progress value={(hechos / pasos.length) * 100} className="h-1" aria-label={`${hechos} de ${pasos.length} pasos`} />
          <ul className="grid">
            {pasos.map(paso => {
              const id = `kanban-paso-${paso.id}`
              return (
                <li key={paso.id} className="group flex min-h-(--control-height) items-center gap-3">
                  <Checkbox id={id} checked={paso.hecho} onCheckedChange={next => onMarcar(paso, next === true)} />
                  <label htmlFor={id}
                    className={cn("min-w-0 flex-1 cursor-pointer break-words py-1 text-body-md",
                      paso.hecho ? "text-muted-foreground line-through" : "text-foreground")}>
                    {paso.texto}
                  </label>
                  <Button type="button" variant="ghost" size="xs"
                    className="shrink-0 px-1 text-muted-foreground sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                    aria-label={`Quitar paso ${paso.texto}`} onClick={() => onEliminar(paso)}>
                    <X aria-hidden="true" />
                  </Button>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {!lleno && (
        <form className="flex gap-2" onSubmit={event => {
          event.preventDefault()
          void agregar()
        }}>
          <Label htmlFor={`kanban-nuevo-paso-${tarjeta.id}`} className="sr-only">Nuevo paso</Label>
          <Input id={`kanban-nuevo-paso-${tarjeta.id}`} placeholder="Agregar paso" autoComplete="off" maxLength={MAX_PASO}
            value={texto} onChange={event => setTexto(limpiarAlEscribir(event.target.value))} />
          <Button type="submit" variant="outline" className="shrink-0" disabled={saving || !texto.trim()} aria-busy={saving || undefined}>Agregar</Button>
        </form>
      )}
      {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
    </section>
  )
}

/** Hilo breve en orden cronológico; cada quien puede borrar solo lo suyo. */
function Comentarios({ tarjeta, comentarios, miembros, userId, onComentar, onEliminar }: {
  tarjeta: KanbanTarjeta
  comentarios: KanbanComentario[]
  miembros: Map<string, KanbanMiembro>
  userId: string | null
  onComentar: (texto: string) => Promise<void>
  onEliminar: (comentario: KanbanComentario) => void
}) {
  const [texto, setTexto] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function publicar() {
    const limpio = normalizarTexto(texto, true)
    if (!limpio) return
    setSaving(true)
    try {
      await onComentar(limpio)
      setTexto("")
      setError(null)
    } catch (cause) {
      setError(mensaje(cause, "No se pudo publicar el comentario."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="kanban-comentarios" className="grid gap-3">
      <h3 id="kanban-comentarios" className={SECTION_TITLE}>
        Comentarios
        {comentarios.length > 0 && <span className="text-body-sm font-normal tabular-nums text-muted-foreground">{comentarios.length}</span>}
      </h3>
      {comentarios.length > 0 && (
        <ul className="grid gap-3">
          {comentarios.map(comentario => {
            const autor = comentario.autor_id ? miembros.get(comentario.autor_id) : undefined
            return (
              <li key={comentario.id} className="group flex gap-3">
                {autor ? <KanbanAvatar miembro={autor} rol="Autor" /> : <span className="size-6 shrink-0 rounded-full bg-secondary" aria-hidden="true" />}
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-body-sm">
                    <span aria-hidden="true" className="font-medium text-foreground">{autor?.nombre ?? "Usuario sin perfil"}</span>
                    <time dateTime={comentario.created_at} className="tabular-nums text-muted-foreground">{formatHace(comentario.created_at)}</time>
                  </p>
                  <p className="whitespace-pre-line break-words text-body-md text-foreground">{comentario.texto}</p>
                </div>
                {comentario.autor_id === userId && (
                  <Button type="button" variant="ghost" size="xs"
                    className="shrink-0 px-1 text-muted-foreground hover:text-destructive sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                    aria-label="Eliminar mi comentario" onClick={() => onEliminar(comentario)}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <form className="grid gap-2" onSubmit={event => {
        event.preventDefault()
        void publicar()
      }}>
        <Label htmlFor={`kanban-comentario-${tarjeta.id}`} className="sr-only">Nuevo comentario</Label>
        <Textarea id={`kanban-comentario-${tarjeta.id}`} rows={1} placeholder="Escribe un comentario"
          className="min-h-(--control-height) resize-none field-sizing-content" maxLength={MAX_COMENTARIO} value={texto}
          onChange={event => setTexto(limpiarAlEscribir(event.target.value, true))}
          onKeyDown={event => {
            // Ctrl/⌘ + Enter publica; Enter solo agrega una línea.
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              void publicar()
            }
          }} />
        <Button type="submit" variant="outline" size="sm" className="justify-self-end" disabled={saving || !texto.trim()} aria-busy={saving || undefined}>
          Comentar
        </Button>
      </form>
      {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
    </section>
  )
}

/** Detalle de la tarjeta: información, checklist y comentarios. La edición abre el asistente. */
export function KanbanDetailDialog({
  tarjeta, miembros, pasos, comentarios, userId, onClose, onEdit,
  onAgregarPaso, onMarcarPaso, onEliminarPaso, onComentar, onEliminarComentario,
}: KanbanDetailDialogProps) {
  const concluida = tarjeta.estado === "concluido"
  return (
    <ResponsiveShell open onClose={onClose} size="md" title={tarjeta.titulo}>
      <ModalHeader title={tarjeta.titulo} onClose={onClose} />
      <div className="grid min-h-0 content-start gap-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <KanbanTipoLabel tipo={tarjeta.tipo} />
            <span className="text-body-sm text-foreground">{etiquetaEstado(tarjeta.estado)}</span>
            <KanbanPrioridadFlag prioridad={tarjeta.prioridad} />
            <KanbanFechas tarjeta={tarjeta} />
            <span className="ml-auto flex items-center gap-2">
              <KanbanApoyo tarjeta={tarjeta} />
              <KanbanPersonas tarjeta={tarjeta} miembros={miembros} />
            </span>
          </div>
          {!concluida && <KanbanBloqueo tarjeta={tarjeta} />}
          {tarjeta.necesita_apoyo && tarjeta.apoyo_nota && (
            <p className="flex items-start gap-1.5 text-body-sm text-foreground">
              <HandHelping className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
              <span>Pide apoyo: {tarjeta.apoyo_nota}</span>
            </p>
          )}
          {tarjeta.descripcion && (
            <p className="whitespace-pre-line break-words text-body-md text-muted-foreground">{tarjeta.descripcion}</p>
          )}
        </div>

        <Checklist tarjeta={tarjeta} pasos={pasos} onAgregar={onAgregarPaso} onMarcar={onMarcarPaso} onEliminar={onEliminarPaso} />
        <div className="border-t border-border" aria-hidden="true" />
        <Comentarios tarjeta={tarjeta} comentarios={comentarios} miembros={miembros} userId={userId}
          onComentar={onComentar} onEliminar={onEliminarComentario} />
      </div>
      <ModalFooter onCancel={onClose} cancelLabel="Cerrar" onConfirm={onEdit} confirmLabel="Editar" />
    </ResponsiveShell>
  )
}
