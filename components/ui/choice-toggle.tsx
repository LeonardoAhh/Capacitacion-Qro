import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ChoiceOption<T extends string> {
  value: T
  label: string
  /** Clase de fondo de un punto de color antes del texto (p. ej. severidad). */
  dot?: string
}

/**
 * Pregunta de opción única (design.md, `choice-toggle`): botones del alto de los campos,
 * sobre blanco con borde y en columnas iguales. La elegida lleva borde y texto en primario,
 * sin relleno; el hover es el gris de los botones con borde. Sin círculos de opción.
 */
export function ChoiceToggle<T extends string>({ id, label, value, options, onChange, className }: {
  /** Prefijo de ids: `${id}-label` y `${id}-${valor}` (para enfocar una opción). */
  id: string
  label: string
  value: T | "" | null | undefined
  options: readonly ChoiceOption<T>[]
  onChange: (value: T) => void
  /** Columnas u otros ajustes de la fila de opciones; por defecto, una por opción. */
  className?: string
}) {
  return (
    <div className="grid min-w-0 content-start gap-2">
      <p id={`${id}-label`} className="text-label-sm text-foreground">{label}</p>
      <div role="group" aria-labelledby={`${id}-label`}
        className={cn("grid gap-2", className ?? (options.length === 3 ? "grid-cols-3" : "grid-cols-2"))}>
        {options.map(option => {
          const elegida = value === option.value
          return (
            <Button key={option.value} id={`${id}-${option.value}`} type="button" variant="outline" aria-pressed={elegida}
              className={cn("min-w-0 px-3 text-body-md", elegida ? "border-primary text-primary hover:text-primary" : "font-normal text-foreground")}
              onClick={() => onChange(option.value)}>
              {option.dot && <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", option.dot)} />}
              <span className="truncate">{option.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
