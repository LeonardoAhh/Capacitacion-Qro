import { isoATexto } from "@/lib/fechas"
import {
  enHojas, FILAS_POR_HOJA, FORMATO_TE_TEXTOS, horasDe, textoHoras, textoJornada, totalHoras, type FilaTE,
} from "@/lib/formato-te"
import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"
import styles from "./formato-te-print.module.css"

const COLUMNAS = [
  { titulo: "Fecha", ancho: "8%" },
  { titulo: "No. EMP", ancho: "6%" },
  { titulo: "Nombre del Trabajador", ancho: "22%" },
  { titulo: "Puesto", ancho: "18%" },
  { titulo: "Jornada Ordinaria", ancho: "9%" },
  { titulo: "Jornada Extraordinaria", ancho: "9%" },
  { titulo: "Número de Horas extras laboradas", ancho: "8%" },
  { titulo: "Firma del Trabajador", ancho: "20%" },
] as const

/** Una hoja: 10 renglones (los que faltan, sombreados e inutilizables) y su total de horas. */
function Hoja({ filas, motivos }: { filas: readonly FilaTE[]; motivos: string }) {
  const vacios = FILAS_POR_HOJA - filas.length
  return (
    <section className={styles.sheet}>
      <header className={styles.header}>
        <img src="/logo-vino-plastic.png" alt="" className={styles.logo} />
        <h1 className={styles.title}>{FORMATO_TE_TEXTOS.titulo}</h1>
      </header>
      <p className={styles.text}>{FORMATO_TE_TEXTOS.solicitud}</p>
      <p className={styles.text}>{FORMATO_TE_TEXTOS.ratificacion}</p>

      <table className={styles.table}>
        <colgroup>{COLUMNAS.map(columna => <col key={columna.titulo} style={{ width: columna.ancho }} />)}</colgroup>
        <thead>
          <tr>{COLUMNAS.map(columna => <th key={columna.titulo} scope="col">{columna.titulo}</th>)}</tr>
        </thead>
        <tbody>
          {filas.map(fila => {
            const horas = horasDe(fila.extraordinaria)
            return (
              <tr key={fila.id}>
                <td>{isoATexto(fila.fecha)}</td>
                <td>{fila.numero}</td>
                <td className={styles.left}>{fila.nombre}</td>
                <td className={styles.left}>{fila.puesto ?? ""}</td>
                <td>{textoJornada(fila.ordinaria)}</td>
                <td>{textoJornada(fila.extraordinaria)}</td>
                <td>{horas ? textoHoras(horas) : ""}</td>
                <td />
              </tr>
            )
          })}
          {/* Renglones sin empleado: sombreados para que no se agregue a nadie a mano. */}
          {Array.from({ length: vacios }, (_, i) => (
            <tr key={`vacio-${i}`} className={styles.vacio} aria-hidden="true">{COLUMNAS.map(columna => <td key={columna.titulo} />)}</tr>
          ))}
          <tr>
            <td colSpan={5} />
            <td>Total</td>
            <td>{textoHoras(totalHoras(filas))}</td>
            <td />
          </tr>
        </tbody>
      </table>

      <p className={styles.motivos}>{FORMATO_TE_TEXTOS.motivos} {motivos}</p>

      <footer className={styles.firmas}>
        {FORMATO_TE_TEXTOS.firmas.map(firma => (
          <div key={firma.cargo} className={styles.firma}>
            {firma.nombre && <span>{firma.nombre}</span>}
            <span>{firma.cargo}</span>
          </div>
        ))}
      </footer>
    </section>
  )
}

/**
 * Formato TE completo, una hoja por cada 10 empleados: es la vista previa en pantalla y lo que
 * se imprime (.print-area; carta horizontal sin márgenes, la hoja trae los suyos).
 */
export function FormatoTEPrint({ filas, motivos, className, style }: {
  filas: readonly FilaTE[]
  motivos: string
  className?: string
  /** Solo pantalla (p. ej. el zoom de la vista previa); al imprimir, .root lo anula. */
  style?: CSSProperties
}) {
  const hojas = filas.length ? enHojas(filas) : [[]]
  return (
    <div className={cn("print-area", styles.root, className)} style={style}>
      {/* Solo esta página imprime en horizontal; el resto de la app conserva su @page vertical. */}
      <style>{"@media print { @page { size: letter landscape; margin: 0; } }"}</style>
      {hojas.map((hoja, indice) => <Hoja key={hoja[0]?.id ?? indice} filas={hoja} motivos={motivos} />)}
    </div>
  )
}
