import { DIAS_MAX, type Accidente, type AtencionAccidente, type DatosAccidente, type PasoSeguimiento, type Severidad } from "@/lib/salud-ocupacional"
import type { EmpleadoElegido } from "./empleado-select"

export type SiNo = "si" | "no" | ""
const aSiNo = (value: boolean | null | undefined): SiNo => value == null ? "" : value ? "si" : "no"
const aTexto = (value: number | null | undefined) => value ? String(value) : ""

export type Paso = 1 | 2 | 3

/** Estado del modal: respuestas en texto (sí/no sin elegir, días a medio escribir). */
export interface FormularioAccidente extends Record<PasoSeguimiento, boolean> {
  fecha: string
  empleado: EmpleadoElegido | null
  descripcion: string
  severidad: Severidad | ""
  riesgo: SiNo
  incapacidad: SiNo
  diasIncapacidad: string
  reporte: SiNo
  atenciones: AtencionAccidente[]
  diasReposo: string
  /** "si" = con goce de sueldo. */
  goce: SiNo
}

export function formularioInicial(accidente: Accidente | null, fecha: string): FormularioAccidente {
  return {
    fecha: accidente?.fecha ?? fecha,
    empleado: accidente ? { numero: accidente.numeroEmpleado, nombre: accidente.colaborador } : null,
    descripcion: accidente?.descripcion ?? "",
    severidad: accidente?.severidad ?? "",
    riesgo: aSiNo(accidente?.riesgoTrabajo),
    incapacidad: aSiNo(accidente?.incapacidad),
    diasIncapacidad: aTexto(accidente?.diasIncapacidad),
    reporte: aSiNo(accidente?.reporteGenerado),
    atenciones: accidente?.atenciones ?? [],
    diasReposo: aTexto(accidente?.diasReposo),
    goce: aSiNo(accidente?.reposoConGoce),
    clinicaRequisicion: accidente?.clinicaRequisicion ?? false,
    clinicaPagoCerrado: accidente?.clinicaPagoCerrado ?? false,
    imssSt7: accidente?.imssSt7 ?? false,
    imssSt2: accidente?.imssSt2 ?? false,
  }
}

const diasValidos = (value: string) => {
  const dias = Number(value)
  return Number.isInteger(dias) && dias >= 1 && dias <= DIAS_MAX
}

/** Qué falta para pasar del paso; null si está completo. */
export function errorDelPaso(form: FormularioAccidente, paso: Paso): string | null {
  if (paso === 1) {
    return !form.fecha || !form.empleado || !form.descripcion.trim()
      ? "Escribe una fecha válida (DD/MM/AAAA), elige al colaborador y describe qué ocurrió."
      : null
  }
  if (paso === 2) {
    if (!form.severidad || !form.riesgo || !form.reporte) return "Indica la severidad, si fue riesgo de trabajo y si se generó el reporte de incidente."
    if (form.riesgo === "si" && !form.incapacidad) return "Indica si hubo incapacidad."
    if (form.riesgo === "si" && form.incapacidad === "si" && !diasValidos(form.diasIncapacidad)) return `Escribe los días de incapacidad (1 a ${DIAS_MAX}).`
    return null
  }
  if (form.atenciones.includes("servicio_medico") && form.diasReposo) {
    if (!diasValidos(form.diasReposo)) return `Escribe los días de reposo (1 a ${DIAS_MAX}) o déjalo vacío.`
    if (!form.goce) return "Indica si el reposo es con goce o sin goce de sueldo."
  }
  return null
}

/** Datos a guardar; la limpieza de lo que no aplica la hace la capa de datos. */
export function aDatos(form: FormularioAccidente, empleado: EmpleadoElegido, severidad: Severidad): DatosAccidente {
  return {
    fecha: form.fecha,
    numeroEmpleado: empleado.numero,
    colaborador: empleado.nombre,
    descripcion: form.descripcion.trim(),
    severidad,
    riesgoTrabajo: form.riesgo === "si",
    incapacidad: form.incapacidad === "si",
    diasIncapacidad: form.diasIncapacidad ? Number(form.diasIncapacidad) : null,
    reporteGenerado: form.reporte === "si",
    atenciones: form.atenciones,
    diasReposo: form.diasReposo ? Number(form.diasReposo) : null,
    reposoConGoce: form.goce === "si",
    clinicaRequisicion: form.clinicaRequisicion,
    clinicaPagoCerrado: form.clinicaPagoCerrado,
    imssSt7: form.imssSt7,
    imssSt2: form.imssSt2,
  }
}
