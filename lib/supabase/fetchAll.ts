import { supabase } from "./client"

type PageResult = { data: unknown; count?: number | null; error: unknown }

type PageLoader = (
  from: number,
  to: number,
  withCount?: boolean,
) => PromiseLike<PageResult>

const PAGE_SIZE = 1_000
const MAX_CONCURRENT_PAGES = 6

function formatPageError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message
  }
  return "Error al cargar filas paginadas."
}

function extractRows<T>(result: PageResult, isTable: boolean): T[] {
  if (result.error) throw new Error(formatPageError(result.error))
  if (!isTable && result.data !== null && !Array.isArray(result.data)) {
    throw new Error("La consulta paginada no devolvió una lista de filas.")
  }
  return (result.data ?? []) as T[]
}

/**
 * Trae todas las filas en páginas de 1,000. Si la primera página devuelve el
 * conteo exacto, descarga el resto en lotes paralelos para reducir la espera.
 */
export function fetchAllRows<T>(loadPage: PageLoader): Promise<T[]>
export function fetchAllRows<T>(table: string, select: string): Promise<T[]>
export async function fetchAllRows<T>(
  tableOrLoader: string | PageLoader,
  select?: string,
): Promise<T[]> {
  const isTable = typeof tableOrLoader === "string"
  if (isTable && !select) {
    throw new Error("A select expression is required when fetching by table name.")
  }

  const runPage = async (from: number, to: number, withCount: boolean): Promise<PageResult> => {
    if (isTable) {
      return supabase
        .from(tableOrLoader)
        .select(select!, withCount ? { count: "exact" } : undefined)
        .range(from, to)
    }
    return tableOrLoader(from, to, withCount)
  }

  const firstResult = await runPage(0, PAGE_SIZE - 1, true)
  const initialRows = extractRows<T>(firstResult, isTable)
  if (initialRows.length < PAGE_SIZE) return initialRows

  const total = firstResult.count
  if (typeof total === "number" && total > PAGE_SIZE) {
    const ranges: Array<[number, number]> = []
    for (let from = PAGE_SIZE; from < total; from += PAGE_SIZE) {
      ranges.push([from, Math.min(from + PAGE_SIZE - 1, total - 1)])
    }
    const all = [...initialRows]
    for (let i = 0; i < ranges.length; i += MAX_CONCURRENT_PAGES) {
      const batch = ranges.slice(i, i + MAX_CONCURRENT_PAGES)
      const pages = await Promise.all(
        batch.map(async ([from, to]) => extractRows<T>(await runPage(from, to, false), isTable))
      )
      for (const page of pages) all.push(...page)
    }
    return all
  }

  const all = [...initialRows]
  let from = PAGE_SIZE
  while (true) {
    const page = extractRows<T>(await runPage(from, from + PAGE_SIZE - 1, false), isTable)
    if (page.length === 0) break
    all.push(...page)
    if (page.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}
