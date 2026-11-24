import { cargarAnioDnc, nombreDepartamento, type DncNecesidad } from "@/lib/dnc"
import type { CursoPlan, DatosCurso, TipoCurso } from "@/lib/plan-anual"

/**
 * Curso autorizado en las DNC de un año, listo para revisarse antes de entrar al
 * plan anual. Los datos salen de las DNC (un solo mes y tipo por curso), pero
 * se editan en la revisión: el plan no se llena solo y las DNC no se tocan.
 */
export interface PropuestaDnc {
  course_id: string
  nombre: string
  mes: number
  tipo: TipoCurso
  area_solicitante: string
  aplica_para: string
  /** Curso del plan con el mismo curso del catálogo, si ya se agregó. */
  enPlan: CursoPlan | null
}

export interface CursoImportado {
  mes: number
  datos: DatosCurso
}

const unir = (valores: string[]) => [...new Set(valores.filter(Boolean))].join(", ")

/** Área que solicita y a quién aplica se expresan por departamento, aunque se capacite a una sola persona. */
export async function cargarPropuestasDnc(anio: number, cursosPlan: CursoPlan[]): Promise<PropuestaDnc[]> {
  const { reportes, necesidades } = await cargarAnioDnc(anio)
  const departamento = new Map(reportes.map(reporte => [reporte.id, nombreDepartamento(reporte)]))

  const porCurso = new Map<string, DncNecesidad[]>()
  for (const need of necesidades) {
    if (need.autorizacion !== "autorizado" || !need.course_id) continue
    porCurso.set(need.course_id, [...(porCurso.get(need.course_id) ?? []), need])
  }

  return [...porCurso.entries()].map(([courseId, needs]) => {
    const departamentos = unir(needs.map(need => departamento.get(need.reporte_id) ?? ""))
    return {
      course_id: courseId,
      nombre: needs[0].curso_nombre,
      mes: needs[0].mes_sugerido,
      tipo: needs[0].tipo,
      area_solicitante: departamentos,
      aplica_para: departamentos,
      enPlan: cursosPlan.find(curso => curso.course_id === courseId) ?? null,
    }
  }).sort((left, right) => left.mes - right.mes || left.nombre.localeCompare(right.nombre, "es"))
}
