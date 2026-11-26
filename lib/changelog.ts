/**
 * Novedades del sistema que ven los usuarios ("changelog").
 * Agrega la entrada nueva AL INICIO de la lista con cada cambio que se suba;
 * el `id` nuevo es lo que enciende el aviso para quien aún no la ha visto.
 * Redacta para quien usa el sistema: qué puede hacer ahora y dónde, sin términos técnicos.
 */

/** Sección del sistema donde ocurre el cambio; la lista agrupa por sección con su ícono del menú. */
export type SeccionNovedad = "Inicio" | "Plantilla" | "Menú"

export interface Novedad {
  /** Único y estable; por convención la fecha más un sufijo si hay varias el mismo día. */
  id: string
  /** "AAAA-MM-DD" */
  fecha: string
  titulo: string
  cambios: { seccion: SeccionNovedad; texto: string }[]
}

export const CHANGELOG: readonly Novedad[] = [
  {
    id: "2026-11-26",
    fecha: "2026-11-26",
    titulo: "Mejoras en Inicio y Plantilla",
    cambios: [
      { seccion: "Inicio", texto: "Ya puedes ver los retardos y las omisiones de marcaje de cada semana, por departamento y por persona." },
      { seccion: "Inicio", texto: "Las gráficas se pueden ver en pantalla completa." },
      { seccion: "Plantilla", texto: "Puedes registrar varios cursos a la vez copiando y pegando la información." },
      { seccion: "Plantilla", texto: "Ahora puedes registrar las omisiones de marcaje de cada empleado." },
      { seccion: "Plantilla", texto: "Los cursos de quien ya no está en la empresa siguen contando en los reportes." },
      { seccion: "Menú", texto: "DNC y Plan Anual ahora están dentro de Capacitación." },
    ],
  },
]

const VISTO_KEY = "changelog-visto"
const listeners = new Set<() => void>()
let abierto = false

function emit() {
  listeners.forEach(listener => listener())
}

export function subscribeChangelog(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Hay una novedad que este navegador aún no ha abierto. */
export function hayNovedad(): boolean {
  const ultima = CHANGELOG[0]?.id
  if (!ultima) return false
  try {
    return window.localStorage.getItem(VISTO_KEY) !== ultima
  } catch {
    return false
  }
}

export function changelogAbierto(): boolean {
  return abierto
}

/** Abre la lista de novedades y la marca como vista. */
export function abrirChangelog() {
  abierto = true
  marcarChangelogVisto()
}

export function cerrarChangelog() {
  abierto = false
  emit()
}

export function marcarChangelogVisto() {
  const ultima = CHANGELOG[0]?.id
  try {
    if (ultima) window.localStorage.setItem(VISTO_KEY, ultima)
  } catch {
    // Sin almacenamiento: el aviso puede volver en la siguiente visita.
  }
  emit()
}
