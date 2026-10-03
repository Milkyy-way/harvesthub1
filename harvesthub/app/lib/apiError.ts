// FastAPI errors arrive as { detail: string } for HTTPExceptions and
// { detail: [{ msg, ... }] } for request validation (422) — turn either into
// one readable line.
export function apiErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg;
  return fallback;
}
