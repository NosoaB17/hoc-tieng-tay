export type Lesson = {
  slug: string;
  title: string;
  summary: string;
  region: string;
};

export type CatalogResult =
  | { state: 'ready'; lessons: Lesson[] }
  | { state: 'empty'; lessons: [] }
  | { state: 'unavailable' };

type CatalogConfig = { url: string; publishableKey: string };
type CatalogResponse = { ok: boolean; json(): Promise<unknown> };
type CatalogRequest = (input: string, init: RequestInit) => Promise<CatalogResponse>;

function isLesson(value: unknown): value is Lesson {
  if (!value || typeof value !== 'object') return false;
  const lesson = value as Record<string, unknown>;
  return ['slug', 'title', 'summary', 'region'].every((field) => typeof lesson[field] === 'string');
}

export async function loadCatalog(
  config: CatalogConfig,
  request: CatalogRequest = fetch,
): Promise<CatalogResult> {
  try {
    const base = new URL(config.url);
    if (
      !['https:', 'http:'].includes(base.protocol) ||
      (base.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(base.hostname)) ||
      !config.publishableKey.startsWith('sb_publishable_')
    ) return { state: 'unavailable' };

    base.pathname = `${base.pathname.replace(/\/+$/, '')}/rest/v1/published_lessons`;
    base.search = new URLSearchParams({
      select: 'slug,title,summary,region',
      order: 'position.asc,slug.asc',
    }).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await request(base.toString(), {
        headers: { apikey: config.publishableKey },
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) return { state: 'unavailable' };
      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(isLesson)) return { state: 'unavailable' };
      return data.length ? { state: 'ready', lessons: data } : { state: 'empty', lessons: [] };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return { state: 'unavailable' };
  }
}
