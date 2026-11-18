"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DesempenoForm } from "@/components/content/desempeno-form-operativo"
import { PendientesLista } from "./pendientes-lista"
import { useRegularizacion } from "./use-regularizacion"
import { useRole } from "@/lib/hooks/useRole"
import { useUser } from "@/lib/hooks/useUser"

export function RegularizacionContenido() {
  const { role, loading: roleLoading } = useRole()
  const { user, loading: userLoading } = useUser()
  const allowed = !roleLoading && !userLoading && Boolean(user) && (role === "admin" || role === "dev")
  const flow = useRegularizacion(allowed)

  if (roleLoading || userLoading) return <p role="status" className="text-sm text-muted-foreground">Cargando acceso…</p>
  if (!allowed) return <Alert variant="destructive"><AlertTitle>Acceso restringido</AlertTitle><AlertDescription>Esta captura está disponible para administración y desarrollo.</AlertDescription></Alert>

  return <div className="space-y-6">
    {flow.error && <Alert variant="destructive" role="alert"><AlertTitle>No se pudo completar la operación</AlertTitle><AlertDescription>{flow.error}</AlertDescription></Alert>}
    {flow.success && <Alert role="status"><AlertTitle>Captura guardada</AlertTitle><AlertDescription>{flow.success}</AlertDescription></Alert>}

    {flow.selected ? <section aria-label={`Captura tardía de ${flow.selected.nombre}`} className="space-y-6">
      {flow.loadingDraft ? <p role="status" className="text-sm text-muted-foreground">Preparando evaluación…</p> : flow.data && <DesempenoForm
        data={flow.data}
        onUpdate={flow.setData}
        onGuardar={flow.guardar}
        guardarDisabled={flow.saving || !flow.motivo.trim()}
        guardarTooltip={flow.motivo.trim() ? undefined : "Explica el motivo de la captura tardía para guardar."}
        saving={flow.saving}
        onExit={flow.cerrar}
        lateCapture={{
          motivo: flow.motivo,
          onMotivoChange: flow.setMotivo,
        }}
      />}
    </section> : flow.loading ? <p role="status" className="text-sm text-muted-foreground">Cargando evaluaciones vencidas…</p>
      : !flow.error && <PendientesLista items={flow.pendientes} onSelect={flow.abrir} />}
  </div>
}
