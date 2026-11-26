"use client"

import { useSyncExternalStore } from "react"
import { AppTransition } from "@/components/app-transition"
import { useMaintenanceMode } from "@/lib/hooks/useMaintenanceMode"
import { MaintenanceScreen } from "./maintenance-screen"
import { MaintenanceLocalIndicator } from "./maintenance-local-indicator"

/**
 * Envuelve la app completa y gestiona el modo mantenimiento según el entorno:
 * - Producción: bloqueo total con MaintenanceScreen.
 * - Local / red: la app sigue funcionando con un indicador flotante no bloqueante.
 */
const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1"]

function getIsLocal(): boolean {
  if (process.env.NODE_ENV === "development") return true
  const { hostname } = window.location
  return LOCAL_HOSTNAMES.includes(hostname) || hostname.startsWith("192.168.")
}

const noopSubscribe = () => () => {}
const SERVER_SNAPSHOT = false

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { isMaintenance, endsAt, loading } = useMaintenanceMode()
  const isLocal = useSyncExternalStore(noopSubscribe, getIsLocal, () => SERVER_SNAPSHOT)

  if (loading) return <AppTransition message="Cargando espacio de trabajo…" />

  if (isMaintenance) {
    if (!isLocal) return <MaintenanceScreen endsAt={endsAt} />

    return (
      <>
        {children}
        <MaintenanceLocalIndicator />
      </>
    )
  }

  return <>{children}</>
}
