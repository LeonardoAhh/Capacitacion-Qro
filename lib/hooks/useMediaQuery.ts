"use client"

import { useSyncExternalStore } from "react"

/** Igual al breakpoint `md` de Tailwind: tablet y escritorio. */
export const DESKTOP_QUERY = "(min-width: 48rem)"

/** true mientras la media query se cumple; en el servidor, false. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    onChange => {
      const media = window.matchMedia(query)
      media.addEventListener("change", onChange)
      return () => media.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
