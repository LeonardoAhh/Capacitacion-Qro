import type { WorkspaceId } from "@/lib/navigation"
import { SAFETY_HOME_PATH, SETTINGS_PATH, TRAINING_WORKSPACE_PATH } from "@/lib/workspace-paths"

/**
 * Roles y permisos: única fuente de verdad en la app.
 * Debe coincidir con la base de datos (profiles_role_check, get_my_role(),
 * puede_capturar_plantilla(), puede_gestionar_seguridad()). Sin React: lo usan
 * también las rutas del servidor.
 */
export const APP_ROLES = ["dev", "analista", "admin", "auxiliar", "ehs", "evaluador"] as const
export type AppRole = (typeof APP_ROLES)[number]

export interface RolePolicy {
  label: string
  /** Espacios de trabajo que puede abrir; vacío = no pasa por /workspace. */
  workspaces: readonly WorkspaceId[]
  /**
   * Rutas permitidas. "/ruta" es exacta y "/ruta/*" incluye la ruta y lo que
   * cuelga de ella. Sin lista, todas las de sus espacios de trabajo.
   */
  routes?: readonly string[]
  /** Inicio fijo; si no hay, el de cada espacio de trabajo. */
  home?: string
  /** Crear y editar en Capacitación (catálogos, empleados, importaciones…). */
  canEdit: boolean
  /** Ve Capacitación sin poder editar: muestra el aviso de solo lectura. */
  readOnly: boolean
  canEvaluate: boolean
  /** Captura en Incidencias, Actas, Incumplimiento y Retardos de cada empleado. */
  canCapturePlantilla: boolean
  /** Crea, edita y borra hallazgos de Seguridad e Higiene y su evidencia. */
  canManageSafety: boolean
  /** Ve las evaluaciones de toda la empresa y la captura tardía. */
  supervisesEvaluations: boolean
  /** En /plantilla solo ve la pestaña de empleados. */
  employeesOnly: boolean
}

const TRAINING = ["training"] as const
const SAFETY = ["safety"] as const

export const ROLE_POLICIES: Record<AppRole, RolePolicy> = {
  dev: {
    label: "Desarrollador", workspaces: ["training", "safety"],
    canEdit: true, readOnly: false, canEvaluate: true, canCapturePlantilla: true,
    canManageSafety: true, supervisesEvaluations: true, employeesOnly: false,
  },
  // Igual que dev en Capacitación; las herramientas de desarrollador siguen
  // ligadas a la cuenta privada (lib/auth/private-developer).
  analista: {
    label: "Analista", workspaces: TRAINING,
    canEdit: true, readOnly: false, canEvaluate: true, canCapturePlantilla: true,
    canManageSafety: false, supervisesEvaluations: true, employeesOnly: false,
  },
  admin: {
    label: "Administrador", workspaces: TRAINING,
    canEdit: false, readOnly: true, canEvaluate: false, canCapturePlantilla: false,
    canManageSafety: false, supervisesEvaluations: true, employeesOnly: false,
  },
  auxiliar: {
    label: "Auxiliar", workspaces: TRAINING, home: "/plantilla",
    routes: ["/plantilla", "/plantilla/incidencias/*", "/plantilla/actas/*", "/plantilla/incumplimientos/*", "/plantilla/retardos/*"],
    canEdit: false, readOnly: true, canEvaluate: false, canCapturePlantilla: true,
    canManageSafety: false, supervisesEvaluations: false, employeesOnly: true,
  },
  ehs: {
    label: "EHS", workspaces: SAFETY,
    canEdit: false, readOnly: false, canEvaluate: false, canCapturePlantilla: false,
    canManageSafety: true, supervisesEvaluations: false, employeesOnly: false,
  },
  evaluador: {
    label: "Evaluador", workspaces: [], home: "/desempeno",
    routes: ["/desempeno", "/desempeno/pendientes/*", "/cursos/*"],
    canEdit: false, readOnly: true, canEvaluate: true, canCapturePlantilla: false,
    canManageSafety: false, supervisesEvaluations: false, employeesOnly: false,
  },
}

export const ROLE_LABELS: Record<AppRole, string> = Object.fromEntries(
  APP_ROLES.map(role => [role, ROLE_POLICIES[role].label]),
) as Record<AppRole, string>

/** Rol desconocido o vacío: se trata como admin (solo lectura), igual que antes. */
export function toAppRole(value: unknown): AppRole {
  return APP_ROLES.includes(value as AppRole) ? value as AppRole : "admin"
}

/** Rutas del espacio de Seguridad e Higiene; el resto pertenece a Capacitación. */
const SAFETY_ROUTES = [SAFETY_HOME_PATH]

function matchesRoute(path: string, rule: string): boolean {
  if (!rule.endsWith("/*")) return path === rule
  const base = rule.slice(0, -2)
  return path === base || path.startsWith(`${base}/`)
}

export function workspaceForRoute(path: string): WorkspaceId {
  return SAFETY_ROUTES.some(route => matchesRoute(path, `${route}/*`)) ? "safety" : "training"
}

/** Configuración (perfil, apariencia) está abierta a todos los roles. */
export function canAccessRoute(role: AppRole, path: string): boolean {
  if (matchesRoute(path, `${SETTINGS_PATH}/*`)) return true
  const policy = ROLE_POLICIES[role]
  if (policy.routes) return policy.routes.some(rule => matchesRoute(path, rule))
  return policy.workspaces.includes(workspaceForRoute(path))
}

/** Pantalla de inicio del rol en un espacio de trabajo (o la suya fija). */
export function homeFor(role: AppRole, workspace: WorkspaceId = ROLE_POLICIES[role].workspaces[0] ?? "training"): string {
  const policy = ROLE_POLICIES[role]
  if (policy.home) return policy.home
  return workspace === "safety" ? SAFETY_HOME_PATH : TRAINING_WORKSPACE_PATH
}

/** Roles que pueden abrir una ruta (p. ej. para filtrar destinatarios en el servidor). */
export function rolesWithRoute(path: string): AppRole[] {
  return APP_ROLES.filter(role => canAccessRoute(role, path))
}

type PermissionKey = { [K in keyof RolePolicy]-?: RolePolicy[K] extends boolean ? K : never }[keyof RolePolicy]

/** Roles con un permiso (p. ej. "canEdit"), para las validaciones del servidor. */
export function rolesWith(permission: PermissionKey): AppRole[] {
  return APP_ROLES.filter(role => ROLE_POLICIES[role][permission])
}
