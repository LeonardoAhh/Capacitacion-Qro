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
  | "Exámenes"
  | "Nuevos Empleados"
  | "Plantilla"
  | "Búsqueda"
  | "Safe Walk"
  | "Occupational Health"
  | "Indicators"
  | "Reports"
  | "Formato TE"
  | "Menú"
  | "General"

export interface Novedad {
  /** Único y estable; por convención la fecha más un sufijo si hay varias el mismo día. */
  id: string
  /** "AAAA-MM-DD" */
  fecha: string
  /** Título corto (máx. ~35 caracteres) para mantenerse en una línea en el modal. */
  titulo: string
  cambios: { seccion: SeccionNovedad; texto: string }[]
}

export const CHANGELOG: readonly Novedad[] = [
  {
    id: "2026-11-27",
    fecha: "2026-11-27",
    titulo: "Plantilla, Formato TE y PDF",
    cambios: [
      { seccion: "Plantilla", texto: "Nuevos Empleados se integró en Plantilla en una sola lista, con filtro de Nuevos ingresos." },
      { seccion: "Plantilla", texto: "Cada nuevo ingreso muestra Nuevo ingreso o Atención, y abre Seguimiento en su menú." },
      { seccion: "Plantilla", texto: "Cargar cursos, Incidencias y Pendientes ahora están en el menú lateral de Plantilla." },
      { seccion: "Plantilla", texto: "El número de empleado es obligatorio sin duplicados; al borrar se quita su seguimiento." },
      { seccion: "Formato TE", texto: "Nueva página en Herramientas para capturar el tiempo extra e imprimir su formato de autorización." },
      { seccion: "Formato TE", texto: "Teclea el número de empleado y se agrega solo; mientras capturas ves cómo queda cada hoja." },
      { seccion: "Reports", texto: "Descarga en PDF el reporte semanal de Safe Walk y Occupational Health, con fotos incluidas." },
    ],
  },
  {
    id: "2026-11-26",
    fecha: "2026-11-26",
    titulo: "Registros y nuevos indicadores",
    cambios: [
      { seccion: "Plantilla", texto: "Las incidencias, actas administrativas, incumplimientos, retardos y omisiones de marcaje de cada empleado ahora están en una sola página: Registros." },
      { seccion: "Plantilla", texto: "Ábrela con la opción Registros del menú de cada empleado y elige el apartado que necesitas." },
      { seccion: "Plantilla", texto: "La matriz de capacitación de cada empleado y la lista de cursos abren más rápido." },
      { seccion: "Exámenes", texto: "Al abrir el examen de un empleado desde el historial, se muestra al instante." },
      { seccion: "Safe Walk", texto: "Los hallazgos que pasaron su plazo sin cerrarse se marcan como Vencido." },
      { seccion: "Safe Walk", texto: "Con el botón Vencidos ves juntos todos los atrasados, de cualquier semana." },
      { seccion: "Indicators", texto: "Nueva página con los hallazgos de cada departamento y los accidentes de cada mes comparados con la meta." },
      { seccion: "General", texto: "En Apariencia, el espacio entre elementos ahora tiene dos opciones: Automática o Compacta." },
      { seccion: "General", texto: "Al restablecer Apariencia, el tema vuelve a Sistema." },
    ],
  },
  {
    id: "2026-11-25-2",
    fecha: "2026-11-25",
    titulo: "Categorías, empleados y reportes",
    cambios: [
      { seccion: "Categorías", texto: "La lista abre más rápido, también al regresar del detalle de una persona." },
      { seccion: "Categorías", texto: "En el detalle de una persona ves sus Criterios, Evaluaciones y Cursos por separado." },
      { seccion: "Categorías", texto: "En Criterios ves el examen y, si debe esperar para presentarlo otra vez, desde qué fecha puede hacerlo." },
      { seccion: "Categorías", texto: "El desempeño ya no se anota a mano: se toma de las evaluaciones." },
      { seccion: "Nuevos Empleados", texto: "Cada persona tiene un botón al final de su fila para editarla o borrarla." },
      { seccion: "Nuevos Empleados", texto: "Las calificaciones de los primeros tres meses se llenan solas, ya no se editan a mano." },
      { seccion: "Plantilla", texto: "Antes de descargar la Auditoría de curso o el Reporte general ves cuántos registros trae, y te avisamos cuando está listo." },
      { seccion: "Menú", texto: "Si cambias entre Capacitación y Seguridad e Higiene con algo sin guardar, te avisamos antes." },
    ],
  },
  {
    id: "2026-11-25",
    fecha: "2026-11-25",
    titulo: "Mejoras en Inicio y Plantilla",
    cambios: [
      { seccion: "Inicio", texto: "Ahora ves los retardos y las omisiones de marcaje de cada semana, por departamento y por persona." },
      { seccion: "Inicio", texto: "Las gráficas se pueden ver en pantalla completa." },
      { seccion: "Plantilla", texto: "Puedes registrar varios cursos a la vez copiando y pegando la lista." },
      { seccion: "Plantilla", texto: "Ahora puedes registrar las omisiones de marcaje de cada empleado." },
      { seccion: "Plantilla", texto: "Los cursos de las personas que ya no trabajan aquí siguen contando en los reportes." },
      { seccion: "Menú", texto: "DNC y Plan Anual ahora están dentro de Capacitación." },
    ],
  },
  {
    id: "2026-11-25",
    fecha: "2026-11-25",
    titulo: "Buscador en barra superior",
    cambios: [
      { seccion: "Búsqueda", texto: "Busca personas, cursos o registros con la lupa de la barra superior." },
      { seccion: "Búsqueda", texto: "Está en Plantilla, Categorías, Nuevos Empleados, Recontratación, Exámenes, Cumpleaños y Desempeño." },
    ],
  },
  {
    id: "2026-11-24",
    fecha: "2026-11-24",
    titulo: "Espacio de Seguridad e Higiene",
    cambios: [
      { seccion: "Safe Walk", texto: "Registra hallazgos de seguridad con foto, área, responsable y fecha límite, y dales seguimiento." },
      { seccion: "Safe Walk", texto: "Ve los hallazgos en tarjetas o en lista, amplía las fotos y cierra cada caso con la foto de la solución." },
      { seccion: "Occupational Health", texto: "Registra accidentes e incidentes con los datos de la persona, la atención médica y su seguimiento." },
      { seccion: "Occupational Health", texto: "Revisa los casos día por día en el calendario y consulta los indicadores de accidentes." },
      { seccion: "Menú", texto: "Si tienes acceso a los dos espacios, elige Capacitación o Seguridad e Higiene al entrar o desde el menú de tu cuenta." },
    ],
  },
  {
    id: "2026-11-23",
    fecha: "2026-11-23",
    titulo: "Mejor en computadora y tablet",
    cambios: [
      { seccion: "General", texto: "El sistema está pensado para usarse en computadora y tablet." },
      { seccion: "General", texto: "En celular algunas pantallas todavía pueden verse distintas o fallar; seguimos mejorándolas." },
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
