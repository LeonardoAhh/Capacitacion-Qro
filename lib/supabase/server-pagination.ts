type PageLoader = (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>

export async function loadServerRows<T>(loadPage: PageLoader): Promise<T[]> {
  const pageSize = 1_000
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await loadPage(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    if (!Array.isArray(data)) throw new Error("La consulta paginada no devolvió una lista")
    rows.push(...data as T[])
    if (data.length < pageSize) return rows
  }
}
