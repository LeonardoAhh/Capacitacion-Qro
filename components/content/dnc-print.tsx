import { MESES } from "@/lib/plan-anual"
import { puestosDeNecesidad, type DncNecesidad, type DncPosition, type DncReporte } from "@/lib/dnc"
import { cn } from "@/lib/utils"
import styles from "./dnc-print.module.css"

/** Datos de control del formato impreso. */
const FORMATO = { codigo: "RG-ADM-001", revision: "Rev. 1" } as const
const TITULO = "REPORTE DE IDENTIFICACION Y DETECCION DE NECESIDADES DE FORMACIÓN"
const INSTRUCCIONES = "Instrucciones: Tomando en cuenta las funciones y responsabilidades contenidas en los descriptivo de puesto así como el resultado en el cumplimiento de objetivos de tu departamento, deberás revisar con tu equipo a cargo, las necesidades de capacitación que ellos o tu identifican y con esa información, debes llenar los siguientes campos:"
const COLUMNAS = [
  { titulo: "NECESIDAD DE CAPACITACIÓN IDENTIFICADA", ancho: "15%" },
  { titulo: "NOMBRE DEL CURSO", ancho: "13%" },
  { titulo: "NOMBRE DE LA PERSONA (S) CON ESA NECESIDAD (ES) DE CAPACITACIÓN", ancho: "12%" },
  { titulo: "CON QUÉ FUNCIÓN / ACTIVIDAD, ESTÁ RELACIONADA ESA NECESIDAD DE CAPACITACIÓN", ancho: "15%" },
  { titulo: "MOTIVO QUE ORIGINA LA NECESIDAD DE CAPACITACIÓN", ancho: "12%" },
  { titulo: "¿CUÁL ES EL BENEFICIO QUE OBTENDRÁ EL ÁREA / EMPRESA, CON ESA CAPACITACIÓN?", ancho: "13%" },
  { titulo: "MES SUGERIDO PARA RECIBIR LA CAPACITACIÓN", ancho: "9%" },
  { titulo: "TIPO DE CAPACITACIÓN (INTERNA, EXTERNA)", ancho: "11%" },
] as const

const fecha = (value: string | null) => value ? value.split("-").reverse().join("/") : ""

/**
 * Formato RG-ADM-001 de la DNC de un departamento, oculto en pantalla y listo para
 * window.print(): carta horizontal, encabezado de columnas y pie en cada hoja.
 */
export function DncPrint({ reporte, necesidades, puestos, departamento }: {
  reporte: DncReporte
  necesidades: DncNecesidad[]
  puestos: DncPosition[]
  departamento: string
}) {
  return (
    <div className={cn("print-area", styles.root)} aria-hidden="true">
      {/* Solo esta página imprime en horizontal; el resto de la app conserva su @page vertical. */}
      <style>{"@media print { @page { size: letter landscape; margin: 8mm 10mm; } }"}</style>
      <header className={styles.header}>
        <img src="/logo-vino-plastic.png" alt="" className={styles.logo} />
        <h1 className={styles.title}>{TITULO}</h1>
      </header>
      <p className={styles.instructions}>{INSTRUCCIONES}</p>

      <table className={styles.table}>
        <colgroup>{COLUMNAS.map(columna => <col key={columna.titulo} style={{ width: columna.ancho }} />)}</colgroup>
        <thead>
          <tr className={styles.meta}>
            <th colSpan={6}>NOMBRE Y FIRMA DEL RESPONSABLE DE ÁREA: {reporte.responsable_nombre ?? ""}</th>
            <th>FECHA DE ELABORACIÓN</th>
            <th className={styles.metaValue}>{fecha(reporte.fecha_elaboracion)}</th>
          </tr>
          <tr>{COLUMNAS.map(columna => <th key={columna.titulo} scope="col">{columna.titulo}</th>)}</tr>
        </thead>
        <tbody>
          {necesidades.map(necesidad => {
            const personas = puestosDeNecesidad(necesidad, puestos, departamento)
            return (
              <tr key={necesidad.id}>
                <td>{necesidad.necesidad}</td>
                <td>{necesidad.curso_nombre}</td>
                <td>{Array.isArray(personas) ? personas.join("/") : personas}</td>
                <td>{necesidad.funcion_actividad}</td>
                <td>{necesidad.motivo}</td>
                <td>{necesidad.beneficio}</td>
                <td>{MESES[necesidad.mes_sugerido - 1].toLocaleUpperCase("es-MX")}</td>
                <td>{necesidad.tipo === "interno" ? "INTERNO" : "EXTERNO"}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot className={styles.footerSpace}><tr><td colSpan={COLUMNAS.length} /></tr></tfoot>
      </table>

      <footer className={styles.footer}>
        <span>{FORMATO.codigo}</span>
        <span>{FORMATO.revision}</span>
      </footer>
    </div>
  )
}
