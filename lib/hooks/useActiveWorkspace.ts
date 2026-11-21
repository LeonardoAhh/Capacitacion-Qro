"use client"

import { useCallback, useSyncExternalStore } from "react"
import { WORKSPACE_STORAGE_KEY, type WorkspaceId } from "@/lib/navigation"

const CHANGE_EVENT = "workspace-change"

function readWorkspace(): WorkspaceId {
  try {
    return window.localStorage.getItem(WORKSPACE_STORAGE_KEY) === "safety" ? "safety" : "training"
  } catch {
    return "training"
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

/**
 * Espacio de trabajo activo, guardado en el navegador.
 * Al navegar entre páginas se lee al instante, sin pantalla de carga;
 * solo vale null en el servidor y durante la hidratación.
 */
export function useActiveWorkspace() {
  const workspace = useSyncExternalStore<WorkspaceId | null>(subscribe, readWorkspace, () => null)

  const setWorkspace = useCallback((next: WorkspaceId) => {
    try {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, next)
    } catch (error) {
      console.error("No se pudo guardar el espacio de trabajo seleccionado.", error)
    }
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  return [workspace, setWorkspace] as const
}
