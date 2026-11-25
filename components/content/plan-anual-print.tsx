"use client"

import { useEffect, useState } from "react"
import { cargarFirmantesPlan, FIRMAS_PLAN, MESES, nombreCursoPlan, ordenarCursosMes, type CursoFijo, type CursoPlan } from "@/lib/plan-anual"
import { cn } from "@/lib/utils"
import styles from "./plan-anual-print.module.css"

/** Datos de control del formato impreso. */
const FORMATO = { codigo: "RG-ADM-004", revision: "REV.1" } as const
const TITULO = (anio: number) => `PLAN ANUAL DE CAPACITACIÓN / PLANTA QUERÉTARO ${anio}`
const mayusculas = (texto: string) => texto.toLocaleUpperCase("es-MX")

/**
 * Plan anual completo para window.print(): un bloque por mes iniciado con sus cursos,
 * firmas al final y pie de control en cada hoja. Oculto en pantalla; carta vertical.
 */
export function PlanAnualPrint({ anio, meses, cursos, fijos }: { anio: number; meses: number[]; cursos: CursoPlan[]; fijos: CursoFijo[] }) {
  // Quien firma sale de Plantilla por su puesto; se consulta una vez por visita.
  const [firmantes, setFirmantes] = useState<Record<string, string>>({})
  useEffect(() => {
    let active = true
    cargarFirmantesPlan().then(nombres => { if (active) setFirmantes(nombres) }).catch(() => {
      // Sin acceso o sin datos: las firmas se imprimen con el nombre en blanco.
    })
    return () => { active = false }
  }, [])

  return (
    <div className={cn("print-area", styles.root)} aria-hidden="true">
      {/* Tabla contenedora: su pie vacío se repite en cada hoja y deja libre el espacio del pie fijo. */}
      <table className={styles.layout}>
        <tbody><tr><td>
          <h1 className={styles.title}>{TITULO(anio)}</h1>
          {meses.map(mes => {
            const delMes = ordenarCursosMes(cursos.filter(curso => curso.mes === mes), fijos)
            return (
              <table key={mes} className={styles.table}>
                <colgroup>
                  <col style={{ width: "48%" }} />
                  <col style={{ width: "19%" }} />
                  <col style={{ width: "19%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "7%" }} />
                </colgroup>
                <thead>
                  <tr className={styles.month}><th colSpan={5}>{mayusculas(MESES[mes - 1])}</th></tr>
                  <tr className={styles.head}>
                    <th rowSpan={2} scope="col">NOMBRE DEL CURSO</th>
                    <th rowSpan={2} scope="col">ÁREA QUE SOLICITA</th>
                    <th rowSpan={2} scope="col">APLICA PARA</th>
                    <th colSpan={2} scope="colgroup" className={styles.typeHead}>TIPO DE CURSO</th>
                  </tr>
                  <tr className={styles.head}>
                    <th scope="col" className={styles.typeHead}>INTERNO</th>
                    <th scope="col" className={styles.typeHead}>EXTERNO</th>
                  </tr>
                </thead>
                <tbody>
                  {delMes.length === 0 ? (
                    <tr><td colSpan={5} className={styles.empty}>SIN CURSOS PROGRAMADOS</td></tr>
                  ) : delMes.map(curso => (
                    <tr key={curso.id}>
                      <td>{mayusculas(nombreCursoPlan(curso))}</td>
                      <td className={styles.center}>{mayusculas(curso.area_solicitante)}</td>
                      <td className={styles.center}>{mayusculas(curso.aplica_para)}</td>
                      <td className={styles.mark}>{curso.tipo === "interno" ? "X" : ""}</td>
                      <td className={styles.mark}>{curso.tipo === "externo" ? "X" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          })}

          <dl className={styles.signatures}>
            {FIRMAS_PLAN.map(firma => (
              <div key={firma.rol}>
                <dt>{firma.rol}:</dt>
                <dd>{firma.puesto}</dd>
                <dd>{firmantes[firma.puesto] ?? ""}</dd>
              </div>
            ))}
          </dl>
        </td></tr></tbody>
        <tfoot><tr><td className={styles.footerSpace} /></tr></tfoot>
      </table>

      <footer className={styles.footer}>
        <span>{FORMATO.codigo}</span>
        <span>{FORMATO.revision}</span>
      </footer>
    </div>
  )
}
