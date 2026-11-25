import { cn } from "@/lib/utils"

interface StepperProps {
  /** Nombres de los pasos, en orden. */
  steps: readonly string[]
  /** Paso actual, empezando en 1. */
  current: number
  className?: string
}

/** Indicador compacto de asistente por pasos: el actual resaltado, los demás en tono neutro. */
export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol aria-label="Pasos" className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {steps.map((label, index) => {
        const number = index + 1
        const isCurrent = number === current
        return (
          <li key={label} aria-current={isCurrent ? "step" : undefined}
            className={cn("flex items-center gap-2 transition-colors duration-200 motion-reduce:transition-none", isCurrent ? "text-label-sm text-foreground" : "text-body-md text-muted-foreground")}>
            {index > 0 && <span aria-hidden="true" className="h-px w-6 bg-border" />}
            <span aria-hidden="true"
              className={cn("flex size-5 items-center justify-center rounded-md text-body-sm tabular-nums transition-colors duration-200 motion-reduce:transition-none",
                isCurrent ? "bg-primary font-medium text-primary-foreground" : "border border-border")}>
              {number}
            </span>
            <span><span className="sr-only">Paso {number} de {steps.length}: </span>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
