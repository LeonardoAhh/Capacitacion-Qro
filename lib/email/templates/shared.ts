/** Piezas comunes de las plantillas de correo (estilos en línea, sin tokens CSS). */

export const EMAIL_BASE_THEME = {
  background: "#eef0f3",
  surface: "#ffffff",
  foreground: "#25282d",
  muted: "#69707a",
  border: "#dfe2e7",
  primary: "#496cc7",
  primaryDark: "#3959ad",
  primarySoft: "#edf1fb",
} as const

export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[
        character
      ] ?? character,
  )
}
