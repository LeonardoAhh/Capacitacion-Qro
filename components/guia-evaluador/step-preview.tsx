import type { ReactNode } from "react"
import { CheckCircle2, Printer, Save, Search, UserRoundPlus, type LucideIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { GUIDE_COPY, type GuideStep } from "@/components/content/desempeno/guide-steps"
import { DESEMPENO, EVALUATION_STEPS } from "@/lib/desempeno/presentation"
import { cn } from "@/lib/utils"

export const EYEBROW = "text-eyebrow uppercase text-muted-foreground"
export const stepNumber = (index: number) => String(index + 1).padStart(2, "0")

/**
 * Vista de referencia de cada paso: imita la pantalla real de /desempeno, sin
 * controles activos. La usan las secciones de la guía y la vista animada de la portada.
 */
export function stepPreview(id: GuideStep["id"]): { label: string; body: ReactNode } {
  switch (id) {
    case "search":
      return {
        label: `${DESEMPENO.pages.evaluation.title} · ${DESEMPENO.search.title}`,
        body: <>
          <MockControl icon={Search}>{DESEMPENO.search.placeholder}</MockControl>
          <PeriodMock value="Se asigna automáticamente" />
          <p className="text-body-sm text-muted-foreground">{DESEMPENO.search.help}</p>
        </>,
      }
    case "period":
      return {
        label: DESEMPENO.search.period,
        body: <>
          <PeriodMock value={`${DESEMPENO.modes.semestrales} · periodo vigente`} />
          <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
            <div className="grid min-w-0 flex-1 gap-1">
              <p className="text-label-sm">Evaluación ya guardada</p>
              <p className="text-body-sm text-muted-foreground">Este periodo ya está completo. Busca otra persona para continuar.</p>
            </div>
          </div>
        </>,
      }
    case "evaluate":
      return {
        label: "Asistente de evaluación",
        body: <>
          <ol className="grid grid-cols-5 gap-1">
            {EVALUATION_STEPS.map((label, index) => (
              <li key={label} className={cn(buttonVariants({ size: "sm", variant: index === 0 ? "default" : "outline" }), "min-w-0 px-1")}>
                <span className="sm:hidden">{index + 1}</span>
                <span className="hidden truncate sm:inline">{label}</span>
              </li>
            ))}
          </ol>
          <MockField label={DESEMPENO.fields.evaluator}>Selecciona al responsable</MockField>
          <p className="text-body-sm text-muted-foreground">Objetivos y responsabilidades: 0 a 100% o No aplica. Competencias: 0 a 4.</p>
        </>,
      }
    case "save":
      return {
        label: `${EVALUATION_STEPS[4]} y compromisos`,
        body: <>
          <MockField label={DESEMPENO.fields.commitments} multiline>Acuerdos de seguimiento</MockField>
          <MockField label={DESEMPENO.fields.reviewDate}>dd/mm/aaaa</MockField>
          <div className="flex justify-end">
            <span className={buttonVariants({ size: "sm" })}><Save aria-hidden="true" />{DESEMPENO.actions.save}</span>
          </div>
        </>,
      }
    default:
      return {
        label: "Evaluación guardada",
        body: <>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div className="grid gap-1">
              <p className="text-heading-md">Evaluación guardada</p>
              <p className="text-body-sm text-muted-foreground">Nombre del empleado · calificación · resultado</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <span className={buttonVariants({ size: "sm", variant: "outline" })}><UserRoundPlus aria-hidden="true" />Evaluar otra persona</span>
            <span className={buttonVariants({ size: "sm" })}><Printer aria-hidden="true" />Imprimir</span>
          </div>
        </>,
      }
  }
}

/** Contenido simulado: decorativo para lectores de pantalla y sin interacción. */
export const PREVIEW_BODY = "pointer-events-none grid content-start gap-3 p-4 select-none"

/** Ilustración de un paso: el pie la nombra y el contenido simulado se oculta a lectores de pantalla. */
export function StepPreview({ id }: { id: GuideStep["id"] }) {
  const { label, body } = stepPreview(id)
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-muted/30">
      <figcaption className={cn(EYEBROW, "border-b border-border px-4 py-2")}>
        <span className="sr-only">{GUIDE_COPY.preview}: </span>{label}
      </figcaption>
      <div aria-hidden="true" className={PREVIEW_BODY}>{body}</div>
    </figure>
  )
}

const MOCK_CONTROL = "flex h-(--control-height) min-w-0 items-center gap-2 rounded-md border border-input bg-card px-3 text-body-md text-muted-foreground"

function MockControl({ icon: Icon, children }: { icon?: LucideIcon; children: ReactNode }) {
  return (
    <div className={MOCK_CONTROL}>
      {Icon && <Icon className="size-4 shrink-0" />}
      <span className="truncate">{children}</span>
    </div>
  )
}

function PeriodMock({ value }: { value: string }) {
  return (
    <div className={cn(MOCK_CONTROL, "text-foreground")}>
      <span className="shrink-0 text-muted-foreground">Periodo</span>
      <span className="truncate text-label-sm">{value}</span>
    </div>
  )
}

function MockField({ label, multiline = false, children }: { label: string; multiline?: boolean; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <p className="text-label-sm">{label}</p>
      <div className={cn(MOCK_CONTROL, multiline && "h-auto min-h-20 items-start py-2")}>{children}</div>
    </div>
  )
}
