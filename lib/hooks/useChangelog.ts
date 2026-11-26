"use client"

import { useSyncExternalStore } from "react"
import { changelogAbierto, hayNovedad, subscribeChangelog } from "@/lib/changelog"

/** Estado compartido del changelog: el botón de la barra, el aviso y la lista leen lo mismo. */
export function useChangelog() {
  // En el servidor no hay almacenamiento: se asume visto para no pintar el punto antes de hidratar.
  const nuevo = useSyncExternalStore(subscribeChangelog, hayNovedad, () => false)
  const abierto = useSyncExternalStore(subscribeChangelog, changelogAbierto, () => false)
  return { nuevo, abierto }
}
