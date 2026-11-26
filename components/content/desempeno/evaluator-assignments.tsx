"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useRole, useUser } from "@/lib/hooks"
import { hasPrivateDeveloperAccess } from "@/lib/auth/private-developer"
import { EvaluatorAreas } from "./evaluator-areas"
import { EvaluatorPeople } from "./evaluator-people"
import { useEvaluatorAssignments } from "./use-evaluator-assignments"

const NOTE = "text-body-md text-muted-foreground"

/**
 * Asignaciones de evaluación: la cuenta evaluadora se elige en la barra; debajo,
 * las áreas completas y las personas sueltas que puede evaluar.
 */
export default function EvaluatorAssignments() {
  const { canEdit, loading: roleLoading } = useRole()
  const { user, loading: userLoading } = useUser()
  const checking = roleLoading || userLoading
  const canManage = !checking && canEdit && hasPrivateDeveloperAccess(user?.email)
  const state = useEvaluatorAssignments(canManage)
  const { accounts, selectedAccount, selectedUserId, selectAccount, loadingAccounts, busy } = state

  if (checking) return <p className={NOTE}>Verificando acceso…</p>
  if (!canManage) return <p role="alert" className={NOTE}>No tienes acceso a las asignaciones.</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-body-sm text-muted-foreground">Define las áreas y personas que puede evaluar cada cuenta compartida.</p>
        {loadingAccounts ? <Skeleton className="h-(--control-height) w-full sm:w-80" />
          : accounts.length === 0 ? <p className={NOTE}>No hay cuentas con rol evaluador.</p>
          : <Select value={selectedUserId} onValueChange={value => void selectAccount(value)} disabled={busy}>
              <SelectTrigger aria-label="Cuenta evaluadora" className="w-full sm:w-80"><SelectValue /></SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem key={account.user_id} value={account.user_id}>
                    {/* Sin nombre visible, el correo solo una vez. */}
                    {account.display_name ? `${account.display_name} · ${account.email}` : account.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>}
      </div>

      {selectedAccount && (
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-y-0">
          <EvaluatorAreas {...state} />
          <EvaluatorPeople {...state} />
        </div>
      )}
    </div>
  )
}
