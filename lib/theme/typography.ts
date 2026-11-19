/**
 * Nombres de la escala tipográfica (AGENTS.md §3.2).
 * Los valores viven en app/globals.css (@theme → --text-<token>).
 * Esta lista registra los tokens en tailwind-merge (lib/utils.ts) para que
 * `cn()` los trate como tamaño de fuente y no como color de texto.
 * Al agregar un token, actualiza ambos lugares.
 */
export const TYPOGRAPHY_TOKENS = [
  "display-2xl",
  "display-xl",
  "display-lg",
  "heading-lg",
  "heading-md",
  "label-sm",
  "eyebrow",
  "body-lg",
  "body-md",
  "body-sm",
] as const

export type TypographyTokenName = (typeof TYPOGRAPHY_TOKENS)[number]
