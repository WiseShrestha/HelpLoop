import "server-only";

const PAGE = 1000; // PostgREST's default row limit

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export async function readAll<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(`Database read failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

