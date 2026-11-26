/**
 * Novedades del sistema que ven los usuarios ("changelog").
 * Agrega la entrada nueva AL INICIO de la lista con cada cambio que se suba;
 * el `id` nuevo es lo que enciende el aviso para quien aún no la ha visto.
 * Redacta para quien usa el sistema: qué puede hacer ahora y dónde, sin términos técnicos.
 */

/** Sección del sistema donde ocurre el cambio; la lista agrupa por sección con su ícono del menú. */
export type SeccionNovedad =
  | "Inicio"
  | "Categorías"
  | "Nuevos Empleados"
  | "Plantilla"
  | "Búsqueda"
  | "Safe Walk"
  | "Occupational Health"
  | "Menú"
  | "General"

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
    id: "2026-11-26-2",
    fecha: "2026-11-26",
    titulo: "Mejoras en Categorías, Nuevos Empleados y reportes",
    cambios: [
      { seccion: "Categorías", texto: "La lista carga mucho más rápido y ya no vuelve a cargar al entrar y salir del detalle de cada persona." },
      { seccion: "Categorías", texto: "Al ver el detalle de una persona, ahora puedes cambiar entre Criterios, Evaluaciones y Cursos, con sus cursos ordenados por nombre, fecha y calificación." },
      { seccion: "Categorías", texto: "En Criterios ahora también se ve el examen y, si hay espera entre intentos, la fecha en que podrá presentarlo de nuevo." },
      { seccion: "Categorías", texto: "Ya no hace falta anotar el desempeño a mano porque se toma de las evaluaciones realizadas." },
      { seccion: "Nuevos Empleados", texto: "Cada persona tiene ahora un botón al final de su fila para editar sus datos o borrarla con confirmación." },
      { seccion: "Nuevos Empleados", texto: "Al editar a una persona ya no aparecen las calificaciones de los primeros tres meses porque se llenan solas." },
      { seccion: "Plantilla", texto: "Antes de descargar la Auditoría de curso o el Reporte general, ahora ves cuánta información incluye el archivo y recibes aviso al terminar." },
      { seccion: "Menú", texto: "Al cambiar entre Capacitación y Seguridad e Higiene, se te avisa si dejaste algo sin guardar." },
    ],
  },
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
  {
    id: "2026-11-25",
    fecha: "2026-11-25",
    titulo: "Buscador rápido en la barra superior",
    cambios: [
      { seccion: "Búsqueda", texto: "Ahora puedes buscar desde la lupa en la barra superior para encontrar personas, cursos o registros sin ocupar espacio sobre las tablas." },
      { seccion: "Búsqueda", texto: "Disponible en Plantilla, Categorías, Nuevos Empleados, Recontratación, Exámenes, Cumpleaños y Desempeño." },
    ],
  },
  {
    id: "2026-11-24",
    fecha: "2026-11-24",
    titulo: "Nuevo espacio de Seguridad e Higiene",
    cambios: [
      { seccion: "Safe Walk", texto: "Ahora puedes registrar, editar y dar seguimiento a hallazgos de seguridad con fotografía, área, responsable y fecha límite." },
      { seccion: "Safe Walk", texto: "Consulta los hallazgos en tarjetas o en lista, abre las fotos en grande y cierra cada caso subiendo la evidencia de solución." },
      { seccion: "Occupational Health", texto: "Registra accidentes e incidentes laborales con los datos de la persona, atención médica, clasificación y seguimiento." },
      { seccion: "Occupational Health", texto: "Revisa los casos por día en el calendario mensual, consulta indicadores de accidentes y da seguimiento a los pendientes." },
      { seccion: "Menú", texto: "Si tienes acceso a ambos espacios, puedes elegir entre Capacitación y Seguridad e Higiene al entrar o cambiar desde el menú de tu cuenta." },
    ],
  },
  {
    id: "2026-11-23",
    fecha: "2026-11-23",
    titulo: "Optimización para computadora y tablet",
    cambios: [
      { seccion: "General", texto: "El sistema se optimizó para usarse en computadora y tablet." },
      { seccion: "General", texto: "Al abrirlo desde celular pueden presentarse algunos errores o pantallas ajustadas de forma distinta mientras seguimos mejorando esa versión." },
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
