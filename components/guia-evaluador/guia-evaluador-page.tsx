import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowDown, ArrowRight, Info } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { WorkspaceContainer } from "@/components/ui/workspace-container"
import { WorkspaceBackdrop } from "@/components/workspace-backdrop"
import { GUIDE_COPY, GUIDE_STEPS, type GuideStep } from "@/components/content/desempeno/guide-steps"
import { DESEMPENO } from "@/lib/desempeno/presentation"
import { cn } from "@/lib/utils"
import { HeroPreview } from "./hero-preview"
import { EYEBROW, StepPreview, stepNumber } from "./step-preview"

/*
 * Guía pública del evaluador. El contenido de cada paso sale de guide-steps y el
 * vocabulario de lib/desempeno/presentation: así la guía sigue el flujo real de
 * /desempeno. Tipografía, espaciado y controles con los tokens de design.md.
 */

const SECTION = "border-b border-border py-16 sm:py-24"
const LOGIN_PATH = "/login"
const ACCESS_ANCHOR = "paso-acceso"
const stepAnchor = (id: GuideStep["id"]) => `paso-${id}`

/** Cierre de la guía: entrar al sistema una vez revisados los pasos. */
const ACCESS_STEP = {
  label: "Acceder",
  title: "Accede al sistema",
  description: "Con la guía revisada, inicia sesión con las credenciales que te envió Recursos Humanos.",
  instructions: [
    "Usa el correo y la contraseña de tu cuenta de evaluador. No compartas el acceso.",
    `Al entrar, comienza en ${DESEMPENO.pages.evaluation.title} y sigue los pasos de esta guía.`,
    "Solo verás y podrás evaluar a los colaboradores que tienes a cargo.",
  ],
  cta: "Acceder al sistema",
} as const

export function GuiaEvaluadorPage() {
  return (
    // Toda la guía sobre el fondo de líneas de la app; las líneas acompañan el desplazamiento.
    <WorkspaceBackdrop fixed className="bg-background sm:min-h-dvh">
      {/* Portada a pantalla completa: a la izquierda la guía; a la derecha un
          recorrido por los pasos. "Consultar pasos" baja al flujo completo. */}
      <header className="flex min-h-dvh items-center border-b border-border">
        <WorkspaceContainer className="grid w-full items-center gap-10 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16">
          <div className="grid justify-items-start gap-4">
            <p className={EYEBROW}>Viñoplastic · Capacitación Planta Querétaro</p>
            <h1 className="text-heading-lg sm:text-display-xl">Guía del evaluador</h1>
            <p className="max-w-2xl text-body-lg text-muted-foreground">
              Una guía paso a paso para evaluar a nuestros colaboradores.
            </p>
            <div className="flex flex-wrap gap-3 pt-4">
              {/* Primero la guía; quien ya la conoce entra directo. El acceso también cierra el flujo. */}
              <Button asChild>
                <a href="#flujo">Consultar pasos<ArrowDown aria-hidden="true" /></a>
              </Button>
              <Button asChild variant="outline" className="bg-card">
                <Link href={LOGIN_PATH}>{ACCESS_STEP.cta}</Link>
              </Button>
            </div>
          </div>

          <HeroPreview />
        </WorkspaceContainer>
      </header>

      <main>
        <section id="flujo" className={cn(SECTION, "scroll-mt-4")} aria-labelledby="flujo-heading">
          <WorkspaceContainer className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="grid content-start gap-3 lg:sticky lg:top-6 lg:self-start">
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
                  <li>
                    <a href={`#${ACCESS_ANCHOR}`}
                      className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start gap-3 px-3 text-body-md font-normal text-muted-foreground")}>
                      <span className="text-label-sm tabular-nums text-primary">{stepNumber(GUIDE_STEPS.length)}</span>
                      {ACCESS_STEP.title}
                    </a>
                  </li>
                </ol>
              </nav>
            </div>

            <ol className="grid min-w-0 gap-6">
              {GUIDE_STEPS.map((step, index) => (
                <li key={step.id}><GuideStepSection step={step} index={index} /></li>
              ))}
              <li><AccessStepSection index={GUIDE_STEPS.length} /></li>
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
    </WorkspaceBackdrop>
  )
}

/** Tarjeta de un paso: número, etiqueta, título y descripción en la cabecera; contenido debajo. */
function StepCard({ anchor, index, label, title, description, children }: {
  anchor: string
  index: number
  label: string
  title: string
  description: string
  children: ReactNode
}) {
  const headingId = `${anchor}-heading`
  return (
    <article id={anchor} aria-labelledby={headingId}
      className="scroll-mt-6 overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-start gap-4 border-b border-border p-(--card-padding)">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-label-sm tabular-nums text-primary">
          {stepNumber(index)}
        </span>
        <div className="grid min-w-0 gap-1">
          <p className={EYEBROW}>{label}</p>
          <h3 id={headingId} className="text-heading-md">{title}</h3>
          <p className="text-body-md text-muted-foreground">{description}</p>
        </div>
      </header>
      {children}
    </article>
  )
}

function InstructionList({ items }: { items: readonly string[] }) {
  return (
    <ol className="grid gap-3">
      {items.map((instruction, instructionIndex) => (
        <li key={instruction} className="flex items-start gap-3 text-body-md">
          <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-md border border-primary/30 bg-primary/5 text-eyebrow tabular-nums text-primary">
            {instructionIndex + 1}
          </span>
          <span>{instruction}</span>
        </li>
      ))}
    </ol>
  )
}

function AccessStepSection({ index }: { index: number }) {
  return (
    <StepCard anchor={ACCESS_ANCHOR} index={index} label={ACCESS_STEP.label} title={ACCESS_STEP.title} description={ACCESS_STEP.description}>
      <div className="grid gap-6 p-(--card-padding) sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <InstructionList items={ACCESS_STEP.instructions} />
        <Button asChild className="justify-self-start">
          <Link href={LOGIN_PATH}>{ACCESS_STEP.cta}<ArrowRight aria-hidden="true" /></Link>
        </Button>
      </div>
    </StepCard>
  )
}

function GuideStepSection({ step, index }: { step: GuideStep; index: number }) {
  return (
    <StepCard anchor={stepAnchor(step.id)} index={index} label={step.label} title={step.title} description={step.description}>
      <div className="grid gap-6 p-(--card-padding) xl:grid-cols-[minmax(0,1fr)_minmax(18rem,1fr)]">
        <div className="grid content-start gap-4">
          <InstructionList items={step.instructions} />

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
    </StepCard>
  )
}
