const DEFAULT_TIMEOUT_MS = 15000

/**
 * Helper fetch que valida res.ok y parsea JSON.
 * Timeout 15s, manejo uniforme de errores.
 */
export class FetchApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
    public cause?: unknown
  ) {
    super(message)
    this.name = "FetchApiError"
  }
}

export async function fetchApi<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit & { timeout?: number }
): Promise<T> {
  const timeoutMs = init?.timeout ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const fetchInit: RequestInit = {
    ...init,
    signal: init?.signal ?? controller.signal,
  }
  delete (fetchInit as any).timeout

  try {
    const res = await fetch(input, fetchInit)
    clearTimeout(timeoutId)

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        (typeof data?.error === "string" ? data.error : null) ||
        `Error ${res.status}: ${res.statusText}`
      throw new FetchApiError(message, res.status, data)
    }
    return data as T
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof FetchApiError) throw error
    if (error instanceof Error && error.name === "AbortError") {
      throw new FetchApiError(
        `La solicitud tardó más de ${timeoutMs / 1000}s`,
        408,
        undefined,
        error
      )
    }
    throw new FetchApiError(
      error instanceof Error ? error.message : "Error de red",
      0,
      undefined,
      error
    )
  }
}
