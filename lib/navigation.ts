/**
 * Single source of truth for app navigation.
 *
 * Consumed by components/sidebar.tsx (menu tree) and components/header.tsx
 * (page titles). Add new routes here once — every consumer updates itself.
 */
import type { LucideIcon } from "lucide-react"
import { IDEAS_PATH, OCCUPATIONAL_HEALTH_PATH, SAFETY_HOME_PATH, TRAINING_WORKSPACE_PATH, WORKSPACE_SELECTION_PATH } from "@/lib/workspace-paths"
import { DESEMPENO } from "@/lib/desempeno/presentation"
import {
  BadgeCheck,
  Cake,
  CalendarDays,
  ClipboardList,
  ClipboardPenLine,
  FileSearch,
  FolderOpen,
  Handshake,
  HeartPulse,
  LayoutDashboard,
  SquareKanban,
  SquarePen,
  TableProperties,
  Tags,
  Target,
  UserPlus,
  UserRoundCog,
  UsersRound,
} from "lucide-react"

export { SAFETY_HOME_PATH } from "@/lib/workspace-paths"

export interface NavLeaf {
  label: string
  href: string
  icon: LucideIcon
}

export interface NavSection {
  label: string
  items: NavLeaf[]
  /** Con título colapsable; sin él, las rutas van sueltas al inicio del menú. */
  collapsible?: boolean
}

export type WorkspaceId = "training" | "safety"

export const WORKSPACE_OPTIONS: ReadonlyArray<{ id: WorkspaceId; label: string }> = [
  { id: "training", label: "Capacitación" },
  { id: "safety", label: "Seguridad e Higiene" },
]

export const WORKSPACE_STORAGE_KEY = "workspace-active"

export const HOME_PATH = "/inicio"
/** Selección posterior al login; los roles sin espacio de trabajo (evaluador) van a su inicio. */
export const POST_LOGIN_PATH = WORKSPACE_SELECTION_PATH
export const LOGIN_PATH = "/login"
export const ASSIGNMENTS_PATH = "/asignaciones"
export const MOBILE_NAV_ID = "workspace-mobile-navigation"
export const DESKTOP_NAV_ID = "workspace-desktop-navigation"
export const MAIN_CONTENT_ID = "main-content"

export const SIDEBAR_COLLAPSED_KEY = "workspace-sidebar-collapsed"
/** Atributo de <html> con la barra oculta: el CSS lo usa mientras React no ha leído la preferencia. */
export const SIDEBAR_COLLAPSED_ATTR = "data-sidebar-collapsed"
/** Se ejecuta antes de hidratar para que la barra no aparezca abierta y luego se cierre. */
export const SIDEBAR_BOOTSTRAP_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(SIDEBAR_COLLAPSED_KEY)})==="true")document.documentElement.setAttribute(${JSON.stringify(SIDEBAR_COLLAPSED_ATTR)},"true")}catch(e){}`

// El menú respeta el orden de las secciones; dentro de cada grupo colapsable las
// rutas se ordenan alfabéticamente al mostrarse. Cada rol ve las rutas que puede
// abrir (lib/constants/roles); un grupo sin rutas visibles no se muestra.
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Inicio",
    items: [
      { label: "Inicio", href: HOME_PATH, icon: LayoutDashboard },
      { label: "Kanban", href: TRAINING_WORKSPACE_PATH, icon: SquareKanban },
    ],
  },
  {
    label: "Desempeño",
    collapsible: true,
    items: [
      { label: DESEMPENO.pages.evaluation.title, href: DESEMPENO.routes.home, icon: SquarePen },
      { label: DESEMPENO.pages.pending.title, href: DESEMPENO.routes.pending, icon: ClipboardList },
      { label: DESEMPENO.pages.saved.title, href: DESEMPENO.routes.saved, icon: FolderOpen },
      { label: DESEMPENO.pages.objectives.title, href: DESEMPENO.routes.objectives, icon: Target },
      { label: "Compromisos", href: "/seguimiento", icon: Handshake },
      { label: "Cumplimiento", href: "/cumplimiento", icon: BadgeCheck },
    ],
  },
  {
    label: "Capacitación",
    collapsible: true,
    items: [
      { label: "Nuevos Empleados", href: "/ingresos", icon: UserPlus },
      { label: "Plantilla", href: "/plantilla", icon: UsersRound },
      { label: "Matriz de Habilidades", href: "/matriz", icon: TableProperties },
      { label: "Categorías", href: "/promociones", icon: Tags },
      { label: "Recontratación", href: "/recontratacion", icon: UserRoundCog },
      { label: "Exámenes", href: "/examenes", icon: ClipboardPenLine },
      { label: "DNC", href: "/dnc", icon: FileSearch },
      { label: "Plan Anual", href: "/plan-anual", icon: CalendarDays },
    ],
  },
  {
    label: "Motivacional",
    collapsible: true,
    items: [
      { label: "Cumpleaños", href: "/cumpleanos", icon: Cake },
    ],
  },
]

export const SAFETY_NAV_SECTIONS: NavSection[] = [
  {
    label: "Safe Walk",
    items: [
      { label: "Safe Walk", href: SAFETY_HOME_PATH, icon: LayoutDashboard },
      { label: "Occupational Health", href: OCCUPATIONAL_HEALTH_PATH, icon: HeartPulse },
    ],
  },
]

export function getWorkspaceNavSections(workspace: WorkspaceId): NavSection[] {
  return workspace === "safety" ? SAFETY_NAV_SECTIONS : NAV_SECTIONS
}

/**
 * Routes that live outside the sidebar menu (public pages, standalone tools)
 * but still need a display title in the header.
 */
const ROUTE_LABEL_OVERRIDES: Record<string, string> = {
  [SAFETY_HOME_PATH]: "Safe Walk",
  [OCCUPATIONAL_HEALTH_PATH]: "Occupational Health",
  "/ingresos/compartir-pendientes": "Compartir pendientes",
  "/dnc": "Reporte de identificación y detección de necesidades de formación",
  "/plan-anual": "Plan Anual",
  "/plantilla/cargar-cursos": "Cargar cursos",
  [IDEAS_PATH]: "Ideas de mejora",
  "/promociones": "Categorías",
  "/promociones/reglas": "Reglas de promoción",
  "/asignaciones": "Asignaciones de evaluación",
  "/calificaciones": "Calificaciones",
  "/cursos": "Cursos",
  "/desempeno": "Evaluación de Desempeño",
  "/cumplimiento": "Cumplimiento de Evaluaciones",
  "/desempeno/formatos": "Formatos de Evaluación en Blanco",
  [DESEMPENO.routes.saved]: DESEMPENO.pages.saved.title,
  [DESEMPENO.routes.pending]: DESEMPENO.pages.pending.title,
  [DESEMPENO.routes.objectives]: DESEMPENO.pages.objectives.title,
  [DESEMPENO.routes.late]: "Captura tardía",
  "/seguimiento": "Seguimiento de Compromisos",
}

const EXTRA_ROUTE_LABELS: Record<string, string> = {
  "/ingresos-semanales": "Ingresos Semanales",
  "/whatsapp": "WhatsApp Bot",
  "/guia-evaluador": "Guía Evaluador",
}

const ROUTE_PREFIX_LABELS = [
  { prefix: "/plantilla/actas/", label: "Actas administrativas" },
  { prefix: "/plantilla/incidencias/", label: "Incidencias" },
  { prefix: "/plantilla/omisiones/", label: "Omisión de marcajes" },
  { prefix: "/plantilla/matriz/", label: "Matriz de capacitación" },
  { prefix: "/plantilla/incumplimientos/", label: "Incumplimientos" },
  { prefix: "/plantilla/retardos/", label: "Retardos" },
  { prefix: "/recontratacion/", label: "Revisión de contrato" },
  { prefix: "/plan-anual/cursos-fijos/", label: "Cursos fijos" },
  { prefix: "/plan-anual/importar-dnc/", label: "Importar DNC" },
  // Después de los overrides exactos: /promociones/reglas conserva su propia etiqueta.
  { prefix: "/promociones/", label: "Detalle de promoción" },
]

/** True when `pathname` is `href` itself or anywhere below it. */
export function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Longest matching leaf inside a section, or undefined. */
export function findActiveLeaf(
  items: NavLeaf[] | undefined,
  pathname: string,
): NavLeaf | undefined {
  return items
    ?.filter((leaf) => isActiveRoute(pathname, leaf.href))
    .sort((a, b) => b.href.length - a.href.length)[0]
}

/**
 * Resolve the canonical header title from explicit route labels before
 * falling back to the shared sidebar navigation labels.
 */
export function getRouteLabel(pathname: string): string {
  if (ROUTE_LABEL_OVERRIDES[pathname]) return ROUTE_LABEL_OVERRIDES[pathname]
  if (EXTRA_ROUTE_LABELS[pathname]) return EXTRA_ROUTE_LABELS[pathname]

  const specificPrefix = ROUTE_PREFIX_LABELS.find(({ prefix }) => pathname.startsWith(prefix))
  if (specificPrefix) return specificPrefix.label

  const leaves = NAV_SECTIONS.flatMap((section) => section.items)

  const exact = leaves.find((leaf) => leaf.href === pathname)
  if (exact) return exact.label

  const prefixed = leaves
    .filter((leaf) => pathname.startsWith(`${leaf.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]
  if (prefixed) return prefixed.label

  return ""
}
