import type { ReactNode } from "react"
import Link from "next/link"
import {
  ArrowRight, CheckCircle2, Info, LockKeyhole, Printer, Save, Search, ShieldCheck,
  UserRoundPlus, type LucideIcon,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { WorkspaceContainer } from "@/components/ui/workspace-container"
import { GUIDE_COPY, GUIDE_STEPS, type GuideStep } from "@/components/content/desempeno/guide-steps"
import { DESEMPENO, EVALUATION_STEPS } from "@/lib/desempeno/presentation"
import { cn } from "@/lib/utils"

/*
 * Guía pública del evaluador. El contenido de cada paso sale de guide-steps y el
 * vocabulario de lib/desempeno/presentation: así la guía sigue el flujo real de
 * /desempeno. Tipografía, espaciado y controles con los tokens de design.md.
 */

const EYEBROW = "text-eyebrow uppercase text-muted-foreground"
const SECTION = "border-b border-border py-16 sm:py-24"
const stepAnchor = (id: GuideStep["id"]) => `paso-${id}`
const stepNumber = (index: number) => String(index + 1).padStart(2, "0")

export function GuiaEvaluadorPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Presentación y acceso en una sola franja: a la izquierda la guía, a la derecha qué se necesita para entrar. */}
      <header className="border-b border-border">
        <WorkspaceContainer className="grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16">
          <div className="grid justify-items-start gap-4">
            <p className={EYEBROW}>Viñoplastic · Capacitación Planta Querétaro</p>
            <h1 className="text-heading-lg sm:text-display-xl">Guía del evaluador</h1>
            <p className="max-w-2xl text-body-lg text-muted-foreground">
              Una guía paso a paso para evaluar a nuestros colaboradores.
            </p>
            <div className="flex flex-wrap gap-3 pt-4">
              <Button asChild>
                <Link href="/login">Acceder al sistema<ArrowRight aria-hidden="true" /></Link>
              </Button>
              <Button asChild variant="outline">
                <a href="#flujo">Consultar pasos</a>
              </Button>
            </div>
          </div>

          <section aria-labelledby="antes-heading" className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid gap-1 border-b border-border p-(--card-padding)">
              <p className={EYEBROW}>Antes de iniciar</p>
              <h2 id="antes-heading" className="text-heading-md">Acceso y alcance</h2>
            </div>
            <ul className="divide-y divide-border">
              <InfoRow icon={LockKeyhole} title="Cuenta asignada">
                Las credenciales se entregan por correo electrónico por Recursos Humanos. No compartas el acceso.
              </InfoRow>
              <InfoRow icon={ShieldCheck} title="Departamentos autorizados">
                Un evaluador consulta únicamente a los colaboradores asignados a su cargo.
              </InfoRow>
            </ul>
          </section>
        </WorkspaceContainer>
      </header>

      <main>
        <section id="flujo" className={cn(SECTION, "scroll-mt-4")} aria-labelledby="flujo-heading">
          <WorkspaceContainer className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="grid content-start gap-3 lg:sticky lg:top-6 lg:self-start">
              <p className={EYEBROW}>Flujo vigente</p>
              <h2 id="flujo-heading" className="text-heading-lg">{GUIDE_COPY.title}</h2>
              <p className="text-body-md text-muted-foreground">{GUIDE_COPY.description}</p>
              <nav className="pt-3" aria-label={GUIDE_COPY.navigation}>
                <ol className="grid gap-1">
                  {GUIDE_STEPS.map((step, index) => (
                    <li key={step.id}>
                      <a href={`#${stepAnchor(step.id)}`}
                        className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start gap-3 px-3 text-body-md font-normal text-muted-foreground")}>
                        <span className="text-label-sm tabular-nums text-primary">{stepNumber(index)}</span>
                        {step.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>

            <ol className="grid min-w-0 gap-6">
              {GUIDE_STEPS.map((step, index) => (
                <li key={step.id}><GuideStepSection step={step} index={index} /></li>
              ))}
            </ol>
          </WorkspaceContainer>
        </section>

      </main>

      <footer>
        <WorkspaceContainer className="flex flex-col gap-2 py-6 text-body-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>ViñoPlastic · Capacitación Planta Querétaro</span>
          <span>Desarrollado e Implementado por LAHH</span>
        </WorkspaceContainer>
      </footer>
    </div>
  )
}

function GuideStepSection({ step, index }: { step: GuideStep; index: number }) {
  const headingId = `${stepAnchor(step.id)}-heading`
  return (
    <article id={stepAnchor(step.id)} aria-labelledby={headingId}
      className="scroll-mt-6 overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-start gap-4 border-b border-border p-(--card-padding)">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-label-sm tabular-nums text-primary">
          {stepNumber(index)}
        </span>
        <div className="grid min-w-0 gap-1">
          <p className={EYEBROW}>{step.label}</p>
          <h3 id={headingId} className="text-heading-md">{step.title}</h3>
          <p className="text-body-md text-muted-foreground">{step.description}</p>
        </div>
      </header>

      <div className="grid gap-6 p-(--card-padding) xl:grid-cols-[minmax(0,1fr)_minmax(18rem,1fr)]">
        <div className="grid content-start gap-4">
          <ol className="grid gap-3">
            {step.instructions.map((instruction, instructionIndex) => (
              <li key={instruction} className="flex items-start gap-3 text-body-md">
                <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-md border border-primary/30 bg-primary/5 text-eyebrow tabular-nums text-primary">
                  {instructionIndex + 1}
                </span>
                <span>{instruction}</span>
              </li>
            ))}
          </ol>

          {step.weights && (
            <dl className="grid gap-2 sm:grid-cols-3" aria-label={GUIDE_COPY.weights}>
              {step.weights.map(weight => (
                <div key={weight.label} className="grid gap-1 rounded-md border border-border p-3">
                  <dt className="text-body-sm text-muted-foreground">{weight.label}</dt>
                  <dd className="text-heading-md tabular-nums">{weight.value * 100}%</dd>
                </div>
              ))}
            </dl>
          )}

          <div role="note" className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 p-3">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-body-sm text-muted-foreground">
              <span className="sr-only">{GUIDE_COPY.reminder}: </span>{step.note}
            </p>
          </div>
        </div>

        <StepPreview id={step.id} />
      </div>
    </article>
  )
}

/** Vista de referencia de cada paso: imita la pantalla real de /desempeno, sin controles activos. */
function StepPreview({ id }: { id: GuideStep["id"] }) {
  switch (id) {
    case "search":
      return (
        <PreviewFrame label={`${DESEMPENO.pages.evaluation.title} · ${DESEMPENO.search.title}`}>
          <MockControl icon={Search}>{DESEMPENO.search.placeholder}</MockControl>
          <PeriodMock value="Se asigna automáticamente" />
          <p className="text-body-sm text-muted-foreground">{DESEMPENO.search.help}</p>
        </PreviewFrame>
      )
    case "period":
      return (
        <PreviewFrame label={DESEMPENO.search.period}>
          <PeriodMock value={`${DESEMPENO.modes.semestrales} · periodo vigente`} />
          <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
            <div className="grid min-w-0 flex-1 gap-1">
              <p className="text-label-sm">Evaluación ya guardada</p>
              <p className="text-body-sm text-muted-foreground">Este periodo ya está completo. Busca otra persona para continuar.</p>
            </div>
          </div>
        </PreviewFrame>
      )
    case "evaluate":
      return (
        <PreviewFrame label="Asistente de evaluación">
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
        </PreviewFrame>
      )
    case "save":
      return (
        <PreviewFrame label={`${EVALUATION_STEPS[4]} y compromisos`}>
          <MockField label={DESEMPENO.fields.commitments} multiline>Acuerdos de seguimiento</MockField>
          <MockField label={DESEMPENO.fields.reviewDate}>dd/mm/aaaa</MockField>
          <div className="flex justify-end">
            <span className={buttonVariants({ size: "sm" })}><Save aria-hidden="true" />{DESEMPENO.actions.save}</span>
          </div>
        </PreviewFrame>
      )
    default:
      return (
        <PreviewFrame label="Evaluación guardada">
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
        </PreviewFrame>
      )
  }
}

/** Ilustración: el pie la nombra y el contenido simulado se oculta a lectores de pantalla. */
function PreviewFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-muted/30">
      <figcaption className={cn(EYEBROW, "border-b border-border px-4 py-2")}>
        <span className="sr-only">{GUIDE_COPY.preview}: </span>{label}
      </figcaption>
      <div aria-hidden="true" className="pointer-events-none grid gap-3 p-4 select-none">{children}</div>
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

function InfoRow({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 p-(--card-padding)">
      <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="grid min-w-0 gap-1">
        <h3 className="text-label-sm">{title}</h3>
        <p className="text-body-md text-muted-foreground">{children}</p>
      </div>
    </li>
  )
}
