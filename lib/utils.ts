import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"
import { TYPOGRAPHY_TOKENS } from "@/lib/theme/typography"

// Registra los tokens tipográficos como tamaños de fuente; sin esto,
// tailwind-merge los trata como color y descarta `text-foreground` o el token.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...TYPOGRAPHY_TOKENS] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generarFolioExamen(id: string, numeroEmpleado?: string | null, fecha?: string) {
  const uuidShort = id.split("-")[0].substring(0, 4).toUpperCase()
  const num = numeroEmpleado ? numeroEmpleado.trim() : "0000"
  let year = new Date().getFullYear().toString().slice(-2)
  if (fecha) {
    try {
      year = new Date(fecha).getFullYear().toString().slice(-2)
    } catch (e) {}
  }
  return `EX-${year}-${num}-${uuidShort}`
}
