import {
  DEPARTAMENTO_POR_GRUPO_EVALUADOR,
  DEPARTAMENTO_SIN_ASIGNAR,
  DEPARTAMENTOS_EVALUADORES,
  getDepartamentoByPuesto,
  normalizeDepartamento,
} from "@/lib/catalogo"

export interface GrupoEvaluadores {
  grupo: string
  evaluadores: string[]
}

const TODOS: GrupoEvaluadores[] = Object.entries(DEPARTAMENTOS_EVALUADORES)
  .map(([grupo, evaluadores]) => ({ grupo, evaluadores }))

function sinPersona(grupos: GrupoEvaluadores[], nombre?: string | null): GrupoEvaluadores[] {
  if (!nombre) return grupos
  return grupos
    .map(({ grupo, evaluadores }) => ({ grupo, evaluadores: evaluadores.filter(item => item !== nombre) }))
    .filter(({ evaluadores }) => evaluadores.length > 0)
}

/**
 * Evaluadores disponibles para un puesto: primero los grupos de su
 * departamento y después los generales (Dirección, Gerencia). Nunca incluye
 * a la persona evaluada. Devuelve el catálogo completo si el puesto no tiene
 * departamento, si el departamento no tiene evaluadores o si `actual`
 * quedaría fuera de la lista filtrada.
 */
export function getGruposEvaluadores({ puesto, evaluado, actual }: {
  puesto?: string | null
  evaluado?: string | null
  actual?: string | null
}): GrupoEvaluadores[] {
  const todos = sinPersona(TODOS, evaluado)
  const departamento = getDepartamentoByPuesto(puesto)
  if (departamento === DEPARTAMENTO_SIN_ASIGNAR) return todos

  const objetivo = normalizeDepartamento(departamento)
  const destinoDe = (grupo: string) => DEPARTAMENTO_POR_GRUPO_EVALUADOR[grupo]
  const propios = todos.filter(({ grupo }) => {
    const destino = destinoDe(grupo)
    return destino != null && normalizeDepartamento(destino) === objetivo
  })
  if (!propios.length) return todos

  const filtrados = [...propios, ...todos.filter(({ grupo }) => destinoDe(grupo) === null)]
  if (actual && !filtrados.some(({ evaluadores }) => evaluadores.includes(actual))) return todos
  return filtrados
}
