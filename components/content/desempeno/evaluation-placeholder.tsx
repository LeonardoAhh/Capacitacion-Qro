import { UserSearch } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DESEMPENO } from "@/lib/desempeno/presentation";
import { cn } from "@/lib/utils";
import { evaluationStyles } from "./presentation";
import { EvaluationStepper } from "./evaluation-progress";

/** Bloques fijos: es una vista de referencia, no una carga en curso. */
const GHOST = "animate-none";
const FIELDS = [DESEMPENO.fields.employeeNumber, DESEMPENO.fields.name, DESEMPENO.fields.position, DESEMPENO.fields.evaluator];
const SECTIONS = [DESEMPENO.sections.objetivos, DESEMPENO.sections.cumplimiento];

/**
 * Estado inicial de Evaluar: silueta de la evaluación que aparece al cargar a una
 * persona (pasos, datos del evaluado y secciones), desvanecida, con la indicación
 * para empezar encima. Decorativa: solo el mensaje se anuncia.
 */
export function EvaluationPlaceholder() {
  return <section aria-labelledby="evaluation-placeholder-title" className="relative isolate print:hidden">
      <div aria-hidden="true" className="pointer-events-none space-y-4 opacity-70 select-none [mask-image:linear-gradient(to_bottom,black_45%,transparent)]">
        <EvaluationStepper activeView={1} onSelect={() => undefined} />

        <Card>
          <CardHeader className="space-y-3 p-(--card-padding)">
            <Skeleton className={cn(GHOST, "h-4 w-full max-w-2xl")} />
            <div className="flex items-center gap-2">
              <Skeleton className={cn(GHOST, "h-6 w-2/3 max-w-md")} />
              <Skeleton className={cn(GHOST, "h-6 w-20")} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-x-6 gap-y-4 p-(--card-padding) pt-0 sm:grid-cols-2">
            {FIELDS.map(label => <div key={label} className="space-y-1.5">
                <p className={evaluationStyles.fieldLabel}>{label}</p>
                <Skeleton className={cn(GHOST, "h-5 w-3/4")} />
              </div>)}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {SECTIONS.map(title => <Card key={title}>
              <CardHeader className="space-y-3 p-(--card-padding)">
                <p className="text-label-sm text-foreground">{title}</p>
                <Skeleton className={cn(GHOST, "h-4 w-full")} />
                <Skeleton className={cn(GHOST, "h-4 w-2/3")} />
              </CardHeader>
            </Card>)}
        </div>
      </div>

      <div className="absolute inset-x-0 top-1/3 flex justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-2 ui-floating-surface rounded-xl bg-card p-(--card-padding) text-center">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
            <UserSearch className="size-5" />
          </span>
          <h2 id="evaluation-placeholder-title" className="text-heading-md text-foreground">Busca una persona para evaluar</h2>
          <p className={evaluationStyles.description}>Escribe su número o nombre arriba.</p>
        </div>
      </div>
    </section>;
}
