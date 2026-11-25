"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AlertCircle, Lightbulb, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useRole } from "@/lib/hooks"
import { enviarIdea, IDEA_MAX, SECCION_GENERAL } from "@/lib/ideas"
import { getRouteLabel, getWorkspaceNavSections, type WorkspaceId } from "@/lib/navigation"
import { notify } from "@/lib/notify"
import { describeSupabaseError } from "@/lib/supabase/errors"
import { cn } from "@/lib/utils"
import { IDEAS_PATH } from "@/lib/workspace-paths"

/**
 * "Ideas de mejora" en la barra lateral: un renglón que abre una captura mínima junto a él
 * (qué mejorarías y, opcional, dónde). Cualquiera puede enviar; la lista la revisa quien
 * tiene canReviewIdeas.
 */
export function IdeaCapture({ workspace, side, triggerClassName, iconBoxClassName, iconClassName, onNavigate }: {
  workspace: WorkspaceId
  /** Escritorio: a la derecha de la barra; menú móvil: hacia arriba. */
  side: "right" | "top"
  /** Mismo estilo que los renglones de la navegación. */
  triggerClassName: string
  iconBoxClassName: string
  iconClassName: string
  /** Al ir a la lista (cierra el menú móvil). */
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const { canAccess, canReviewIdeas } = useRole()
  const [open, setOpen] = useState(false)
  const [texto, setTexto] = useState("")
  const [seccion, setSeccion] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Secciones del espacio actual que la persona puede abrir; propone la página donde está.
  const secciones = [SECCION_GENERAL, ...new Set(getWorkspaceNavSections(workspace)
    .flatMap(section => section.items.filter(item => canAccess(item.href)).map(item => item.label)))]

  function abrir(next: boolean) {
    if (next) {
      const actual = getRouteLabel(pathname ?? "")
      // Propone la página donde está; si no está en la lista, hay que elegirla.
      setSeccion(secciones.includes(actual) ? actual : "")
      setError(null)
    }
    setOpen(next)
  }

  async function enviar(event: FormEvent) {
    event.preventDefault()
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
      setOpen(false)
      notify.success("Gracias, idea enviada")
    } catch (err) {
      setError(describeSupabaseError(err, "No se pudo enviar la idea. Inténtalo de nuevo."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={abrir}>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClassName}>
          <span className={cn("grid shrink-0 place-items-center rounded-md text-muted-foreground", iconBoxClassName)}>
            <Lightbulb className={iconClassName} aria-hidden="true" />
          </span>
          <span className="truncate">Ideas de mejora</span>
        </button>
      </PopoverTrigger>
      {/* collisionPadding: separado de los bordes de la pantalla. El margen va en el formulario: una
          regla global (globals.css) quita el padding inferior a todo [role="dialog"], y el panel lo es. */}
      <PopoverContent side={side} align="end" sideOffset={8} collisionPadding={16} className="w-80 max-w-[calc(100vw-2rem)] p-0">
        <form className="grid gap-3 p-4" onSubmit={event => void enviar(event)} noValidate>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="idea-texto">¿Qué mejorarías?</Label>
              <span className="text-body-sm tabular-nums text-muted-foreground">{texto.length}/{IDEA_MAX}</span>
            </div>
            <Textarea id="idea-texto" autoFocus rows={3} maxLength={IDEA_MAX} value={texto} disabled={saving}
              className="min-h-20 resize-none field-sizing-content"
              aria-invalid={(Boolean(error) && !texto.trim()) || undefined} aria-describedby={error ? "idea-error" : undefined}
              onChange={event => { setTexto(event.target.value); setError(null) }} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="idea-seccion">¿Dónde?</Label>
            <Select value={seccion} onValueChange={value => { setSeccion(value); setError(null) }} disabled={saving}>
              <SelectTrigger id="idea-seccion" aria-invalid={(Boolean(error) && !seccion) || undefined}><SelectValue placeholder="Selecciona una sección" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {secciones.map(nombre => <SelectItem key={nombre} value={nombre}>{nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <Alert variant="destructive" id="idea-error" className="bg-destructive/10 p-3 [&>svg]:left-3 [&>svg]:top-3">
              <AlertCircle className="size-4" aria-hidden="true" />
              <AlertDescription className="text-body-sm">{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex items-center gap-2">
            {canReviewIdeas && (
              <Link href={IDEAS_PATH} className="relative touch-target mr-auto inline-flex items-center rounded-sm text-body-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                onClick={() => { setOpen(false); onNavigate?.() }}>
                Ver todas
              </Link>
            )}
            <Button type="submit" className="ml-auto" disabled={saving} aria-busy={saving || undefined}>
              {saving && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}Enviar
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
