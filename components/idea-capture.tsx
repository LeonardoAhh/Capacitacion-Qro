"use client"

import { cloneElement, useId, useRef, useState, type ButtonHTMLAttributes, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactElement, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight, Lightbulb, Loader2, SendHorizontal } from "lucide-react"
import { AutoHeight } from "@/components/ui/auto-height"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useRole } from "@/lib/hooks"
import { enviarIdea, IDEA_MAX, SECCION_GENERAL } from "@/lib/ideas"
import { findActiveLeaf, getWorkspaceNavSections, isActiveRoute, type WorkspaceId } from "@/lib/navigation"
import { notify } from "@/lib/notify"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { cn } from "@/lib/utils"

const EXTRA_TRAINING_SECTIONS: readonly { label: string; href: string }[] = [
  { label: "DNC", href: "/dnc" },
  { label: "Plan Anual", href: "/plan-anual" },
]

type TriggerProps = ButtonHTMLAttributes<HTMLButtonElement>

/**
 * "Ideas de mejora" en la barra lateral: el renglón abre, dentro de la propia barra, una
 * captura en dos pasos (qué mejorarías y dónde) con navegación ‹ ›. Cualquiera puede enviar;
 * la lista la revisa quien tiene canReviewIdeas desde el menú de su cuenta.
 */
export function IdeaCapture({ workspace, triggerClassName, iconBoxClassName, iconClassName, trigger, onOpenChange, aside }: {
  workspace: WorkspaceId
  /** Mismo estilo que los renglones de la navegación. */
  triggerClassName: string
  iconBoxClassName: string
  iconClassName: string
  /**
   * Disparador propio (renglón que alterna con Novedades). Si su onClick llama
   * preventDefault, la captura no se abre: el clic era para otra acción.
   */
  trigger?: ReactElement<TriggerProps>
  /** Avisa al abrir y cerrar (p. ej. para pausar la alternancia del renglón). */
  onOpenChange?: (open: boolean) => void
  /** Junto al renglón, en su misma fila (campana del evaluador): el panel abierto usa todo el ancho. */
  aside?: ReactNode
}) {
  const pathname = usePathname()
  const { canAccess } = useRole()
  const panelId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [paso, setPaso] = useState<1 | 2>(1)
  const [open, setOpen] = useState(false)
  const [texto, setTexto] = useState("")
  const [seccion, setSeccion] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const navLeaves = getWorkspaceNavSections(workspace)
    .flatMap(section => section.items.filter(item => canAccess(item.href)))
  const extraLeaves = workspace === "training"
    ? EXTRA_TRAINING_SECTIONS.filter(item => canAccess(item.href))
    : []
  const secciones = [
    SECCION_GENERAL,
    ...new Set([...navLeaves.map(item => item.label), ...extraLeaves.map(item => item.label)]),
  ]

  function seccionActual(currentPath: string): string {
    const extra = extraLeaves.find(item => isActiveRoute(currentPath, item.href))
    if (extra) return extra.label
    const activeLeaf = findActiveLeaf(navLeaves, currentPath)
    if (activeLeaf) return activeLeaf.label
    return SECCION_GENERAL
  }

  function abrir(next: boolean) {
    if (next) {
      const propuesta = seccionActual(pathname ?? "")
      setSeccion(secciones.includes(propuesta) ? propuesta : SECCION_GENERAL)
      setError(null)
      setPaso(1)
    }
    setOpen(next)
    onOpenChange?.(next)
  }

  async function enviar(event?: FormEvent) {
    event?.preventDefault()
    if (saving) return
    if (!texto.trim() || !seccion) {
      setError(!texto.trim() ? "Escribe tu idea." : "Elige dónde aplica la idea.")
      return
    }
    setSaving(true)
    try {
      // El autor lo registra la base de datos con la sesión.
      await enviarIdea(texto, seccion)
      setTexto("")
      abrir(false)
      notify.success("Gracias, idea enviada")
    } catch (err) {
      setError(describeSupabaseError(err, "No se pudo enviar la idea. Inténtalo de nuevo."))
    } finally {
      setSaving(false)
    }
  }

  function siguiente() {
    if (!texto.trim()) {
      setError("Escribe tu idea.")
      return
    }
    setError(null)
    setPaso(2)
  }

  /** Esc cierra la captura y devuelve el foco al renglón que la abrió. */
  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Escape" || saving) return
    event.stopPropagation()
    abrir(false)
    wrapperRef.current?.querySelector<HTMLButtonElement>(`[aria-controls="${panelId}"]`)?.focus()
  }

  const triggerProps = { "aria-expanded": open, "aria-controls": panelId }
  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    if (!event.defaultPrevented) abrir(!open)
  }
  const triggerEl = trigger
    ? cloneElement(trigger, {
      ...triggerProps,
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        trigger.props.onClick?.(event)
        toggle(event)
      },
    })
    : (
      <button type="button" className={triggerClassName} onClick={toggle} {...triggerProps}>
        <span className={cn("grid shrink-0 place-items-center rounded-md text-muted-foreground", iconBoxClassName)}>
          <Lightbulb className={iconClassName} aria-hidden="true" />
        </span>
        <span className="truncate">Ideas de mejora</span>
      </button>
    )

  return (
    <div ref={wrapperRef} className="min-w-0">
      {/* Captura dentro de la barra, al ancho disponible; mismo cambio de paso que los asistentes de los modales. */}
      {open && (
        <form id={panelId} aria-label="Nueva idea de mejora" noValidate onKeyDown={onKeyDown}
          onSubmit={event => void enviar(event)} className="mb-2 rounded-xl border bg-card p-3">
          {/* Título del paso y navegación ‹ › en la misma fila; en el último paso, › se vuelve Enviar. */}
          <div className="mb-2 flex items-center gap-1">
            <Label htmlFor={paso === 1 ? "idea-texto" : "idea-seccion"} className="min-w-0 flex-1 truncate">
              {paso === 1 ? "Tu idea" : "¿Dónde?"}
            </Label>
            <Button type="button" variant="ghost" size="xs" className="size-8 shrink-0 px-0 text-muted-foreground" aria-label="Paso anterior"
              disabled={paso === 1 || saving} onClick={() => { setError(null); setPaso(1) }}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            {paso === 1 ? (
              // key distinta: al avanzar se monta otro botón, así el mismo clic no envía el formulario.
              <Button key="siguiente" type="button" variant="ghost" size="xs" className="size-8 shrink-0 px-0 text-muted-foreground" aria-label="Siguiente paso" onClick={siguiente}>
                <ChevronRight aria-hidden="true" />
              </Button>
            ) : (
              <Button key="enviar" type="button" variant="ghost" size="xs" className="size-8 shrink-0 px-0 text-primary" aria-label="Enviar idea"
                disabled={saving} aria-busy={saving || undefined} onClick={() => void enviar()}>
                {saving ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <SendHorizontal aria-hidden="true" />}
              </Button>
            )}
          </div>
          <AutoHeight>
            {paso === 1 ? (
              <div key="paso-1" className="step-enter">
                <Textarea id="idea-texto" autoFocus rows={3} maxLength={IDEA_MAX} value={texto} disabled={saving}
                  className="min-h-20 resize-none"
                  aria-invalid={(Boolean(error) && !texto.trim()) || undefined} aria-describedby={error ? "idea-error" : undefined}
                  onChange={event => { setTexto(event.target.value); setError(null) }} />
              </div>
            ) : (
              <div key="paso-2" className="step-enter">
                <Select value={seccion} onValueChange={value => { setSeccion(value); setError(null) }} disabled={saving}>
                  <SelectTrigger id="idea-seccion" aria-invalid={(Boolean(error) && !seccion) || undefined}><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent matchTriggerWidth className="max-h-60">
                    {secciones.map(nombre => <SelectItem key={nombre} value={nombre}>{nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </AutoHeight>
          {error && <p id="idea-error" role="alert" className="mt-2 text-body-sm text-destructive">{error}</p>}
        </form>
      )}
      {aside ? (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">{triggerEl}</div>
          {aside}
        </div>
      ) : triggerEl}
    </div>
  )
}
