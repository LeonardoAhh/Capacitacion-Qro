import { cn } from "@/lib/utils"

/**
 * Marca del toast: cuatro celdas del color del tipo. Mientras algo carga, se encienden por
 * turnos (con movimiento reducido quedan quietas).
 */
export function ToastMark({ toneClass, loading, reducedMotion }: { toneClass: string; loading: boolean; reducedMotion: boolean }) {
  return (
    <span aria-hidden="true" className={cn("grid size-2.5 shrink-0 grid-cols-2 gap-0.5", toneClass)}>
      {[0, 1, 3, 2].map(orden => (
        <span
          key={orden}
          className={cn("rounded-[1px] bg-current", loading && !reducedMotion && "toast-mark-cycle")}
          style={loading && !reducedMotion ? { animationDelay: `${orden * 150}ms` } : undefined}
        />
      ))}
    </span>
  )
}
