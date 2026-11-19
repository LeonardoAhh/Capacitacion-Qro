import { COMPANY_NAME, COMPANY_SUBTITLE } from "@/lib/constants/company"
import { EMAIL_BASE_THEME as THEME, escapeHtml } from "./shared"

export interface KanbanResumenItem {
  titulo: string
  /** "Vencida · 12 nov", "Vence 20 nov", nota de apoyo, etc. */
  detalle: string
  /** Resalta el detalle (p. ej. vencida). */
  alerta?: boolean
}

export interface KanbanResumenProps {
  nombre: string
  semana: string
  pendientes: KanbanResumenItem[]
  apoyo: KanbanResumenItem[]
  concluidasEquipo: number
  enlace: string
}

// --destructive del tema claro (globals.css) en hex, porque el correo no usa variables CSS.
const DANGER = "#8f1d1d"

function lista(titulo: string, vacio: string, items: KanbanResumenItem[]) {
  const filas = items.length
    ? items.map(item => `
        <tr>
          <td style="padding:10px 0;border-top:1px solid ${THEME.border};">
            <p style="margin:0;font-size:14px;line-height:1.4;font-weight:600;color:${THEME.foreground};">${escapeHtml(item.titulo)}</p>
            <p style="margin:2px 0 0;font-size:13px;line-height:1.4;color:${item.alerta ? DANGER : THEME.muted};">${escapeHtml(item.detalle)}</p>
          </td>
        </tr>`).join("")
    : `<tr><td style="padding:10px 0;border-top:1px solid ${THEME.border};font-size:13px;color:${THEME.muted};">${escapeHtml(vacio)}</td></tr>`
  return `
    <h2 style="margin:24px 0 4px;font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:${THEME.muted};">${escapeHtml(titulo)}</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${filas}</table>`
}

/** Resumen semanal del tablero: lo propio que vence, quién pide apoyo y lo concluido por el equipo. */
export function kanbanResumenHtml({ nombre, semana, pendientes, apoyo, concluidasEquipo, enlace }: KanbanResumenProps): string {
  const companyName = escapeHtml(COMPANY_NAME)
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <title>Resumen semanal del Kanban</title>
  </head>
  <body style="box-sizing:border-box;margin:0;background:${THEME.background};color:${THEME.foreground};font-family:'Mona Sans',Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:${THEME.background};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;border:1px solid ${THEME.border};border-radius:14px;background:${THEME.surface};">
            <tr>
              <td style="padding:28px 32px 8px;">
                <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${THEME.primary};">Kanban · ${escapeHtml(semana)}</p>
                <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;font-weight:600;color:${THEME.foreground};">Hola, ${escapeHtml(nombre)}</h1>
                <p style="margin:6px 0 0;font-size:14px;line-height:1.6;color:${THEME.muted};">
                  La semana pasada el equipo concluyó ${concluidasEquipo} ${concluidasEquipo === 1 ? "tarjeta" : "tarjetas"}.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                ${lista("Para ti esta semana", "Nada vence esta semana.", pendientes)}
                ${lista("El equipo pide apoyo", "Nadie pidió apoyo.", apoyo)}
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
                  <tr>
                    <td style="border-radius:8px;background:${THEME.primary};">
                      <a href="${escapeHtml(enlace)}" style="display:inline-block;padding:10px 18px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Abrir tablero</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid ${THEME.border};color:${THEME.muted};font-size:12px;line-height:1.6;">
                <strong style="color:${THEME.foreground};">${companyName}</strong> · ${escapeHtml(COMPANY_SUBTITLE)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
