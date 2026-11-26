"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"

const STORAGE_KEY = "workspace-sidebar-groups-closed"
const EMPTY: string[] = []

const listeners = new Set<() => void>()
let cachedRaw: string | null | undefined
let cachedValue: string[] = EMPTY
// Sin almacenamiento (modo privado, cuota llena) el estado sigue en memoria.
let storageAvailable = true

function parse(raw: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]")
    return Array.isArray(parsed) ? parsed.filter((label): label is string => typeof label === "string") : EMPTY
  } catch {
    return EMPTY
  }
}

function getSnapshot(): string[] {
  if (!storageAvailable) return cachedValue
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw !== cachedRaw) {
      cachedRaw = raw
      cachedValue = parse(raw)
    }
  } catch {
    storageAvailable = false
  }
  return cachedValue
}

function getServerSnapshot(): string[] {
  return EMPTY
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

function write(next: string[]) {
  cachedValue = next
  cachedRaw = JSON.stringify(next)
  if (storageAvailable) {
    try {
      window.localStorage.setItem(STORAGE_KEY, cachedRaw)
    } catch (error) {
      storageAvailable = false
      console.error("No se pudieron guardar los grupos del menú.", error)
    }
  }
  listeners.forEach((listener) => listener())
}

/**
 * Grupos del menú que la persona cerró. Se guardan los cerrados para que un grupo
 * nuevo aparezca abierto. El grupo de la ruta actual se abre al entrar a ella;
 * si después se cierra, se respeta.
 */
export function useClosedNavGroups(activeGroup: string | undefined) {
  const closed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    if (!activeGroup) return
    const current = getSnapshot()
    if (current.includes(activeGroup)) write(current.filter((label) => label !== activeGroup))
  }, [activeGroup])

  const setClosed = useCallback((next: (current: string[]) => string[]) => write(next(getSnapshot())), [])

  return [closed, setClosed] as const
}
