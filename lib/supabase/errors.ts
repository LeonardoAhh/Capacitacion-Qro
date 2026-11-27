/**
 * Mensajes que no son para quien usa el sistema: inglés de la base o del navegador, códigos,
 * nombres de tablas o de servicios. Esos se cambian por el texto de respaldo.
 */
const TECNICO = /\b(the|of|is|not|failed|invalid|column|relation|violates|function|does|exist|syntax|denied|timeout|unexpected|undefined|null|error|request|status|key|json|array|api|jwt|rpc|schema|constraint|supabase|resend|twilio|vapid|fetch)\b|[a-z]+_[a-z]+|\(\d{3}\)|https?:|[{}[\]]/i

/**
 * Translate a Supabase / Postgres error (or any thrown value) into a short user-facing
 * Spanish message. Accepts PostgrestError, Error, a plain string or unknown.
 */
export function describeSupabaseError(err: unknown, fallback = "Algo salió mal"): string {
  if (!err) return fallback

  const e = (typeof err === "string" ? { message: err } : err) as {
    code?: string
    message?: string
  }
  const message = (e.message ?? "").toLowerCase()
  const code = e.code ?? ""

  // Role-gated writes — from the profiles_guard_role trigger or RLS.
  if (
    code === "42501" ||
    message.includes("insufficient_privilege") ||
    message.includes("only dev role") ||
    message.includes("row-level security") ||
    message.includes("row level security")
  ) {
    return "No tienes permiso para este cambio"
  }

  // Unique constraint violations.
  if (code === "23505" || message.includes("duplicate key")) {
    return "Ya existe un registro con esos datos"
  }

  // Foreign-key violations.
  if (code === "23503" || message.includes("foreign key")) {
    return "No se puede eliminar: tiene registros ligados"
  }

  // Not-null violations.
  if (code === "23502" || message.includes("null value")) {
    return "Faltan datos obligatorios"
  }

  // Check-constraint violations.
  if (code === "23514" || message.includes("check constraint")) {
    return "Hay un dato que no es válido"
  }

  // Auth errors from Supabase-JS.
  if (message.includes("jwt expired") || message.includes("invalid jwt")) {
    return "Tu sesión expiró. Vuelve a entrar"
  }

  // Network / fetch failures (Chrome, Firefox and Safari wording).
  if (message.includes("failed to fetch") || message.includes("networkerror") || message.includes("load failed")) {
    return "Sin conexión a internet"
  }

  // Known no-rows shape (PGRST116) — generally handled before reaching here.
  if (code === "PGRST116") {
    return "No se encontraron resultados"
  }

  // Un error de la base sin traducir, o un texto técnico, no se muestra tal cual.
  if (code || !e.message || TECNICO.test(e.message)) return fallback
  return e.message
}
