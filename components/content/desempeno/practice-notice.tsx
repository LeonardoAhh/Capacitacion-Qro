"use client"

import { GraduationCap, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useProfile, useRole, useUser } from "@/lib/hooks"

/**
 * Aviso para el evaluador que aún no practica: invita a la práctica sin bloquear
 * la página. Desaparece al practicar o cerrarlo, y queda guardado en su perfil.
 * La práctica sigue disponible en el botón Guía.
 */
export function PracticeNotice({ onPractice }: { onPractice: () => void }) {
  const { isEvaluador } = useRole()
  const { user } = useUser()
  const { profile, updateProfile } = useProfile(user?.id)

  if (!isEvaluador || !profile || profile.practiceSeen) return null

  const markSeen = () => { void updateProfile({ practiceSeen: true }, { silent: true }) }

  return (
    <section aria-labelledby="practice-notice-title"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-(--card-padding) print:hidden">
      <GraduationCap className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="grid min-w-0 flex-1 gap-1">
        <h2 id="practice-notice-title" className="text-label-sm text-foreground">¿Primera vez evaluando?</h2>
        <p className="text-body-sm text-muted-foreground">Practica con un ejemplo de datos ficticios; nada se guarda ni se imprime.</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" size="sm" onClick={() => { markSeen(); onPractice() }}>Practicar</Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Cerrar aviso de práctica" onClick={markSeen}>
          <X aria-hidden="true" />
        </Button>
      </div>
    </section>
  )
}
