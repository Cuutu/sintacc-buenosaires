/**
 * Logger estructurado JSON para APIs.
 * Campos: route, userId?, ip?, status?, durationMs?, error?, message
 */
export type LogLevel = "info" | "warn" | "error"

export interface LogContext {
  route?: string
  userId?: string
  ip?: string
  status?: number
  durationMs?: number
  error?: string
  message?: string
  [key: string]: unknown
}

function log(level: LogLevel, context: LogContext) {
  const payload = {
    level,
    timestamp: new Date().toISOString(),
    ...context,
  }
  const line = JSON.stringify(payload)
  if (level === "error") {
    process.stderr.write(line + "\n")
  } else {
    process.stdout.write(line + "\n")
  }
}

export const logger = {
  info(ctx: LogContext) {
    log("info", ctx)
  },
  warn(ctx: LogContext) {
    log("warn", ctx)
  },
  error(ctx: LogContext) {
    log("error", ctx)
  },
}

/** Helper para APIs: loguea error con route/ip desde Request */
export function logApiError(
  route: string,
  error: unknown,
  opts?: { request?: { headers: Headers }; userId?: string; status?: number }
) {
  let ip: string | undefined
  if (opts?.request) {
    const forwarded = opts.request.headers.get("x-forwarded-for")
    ip = forwarded?.split(",")[0]?.trim() || opts.request.headers.get("x-real-ip")?.trim()
  }
  logger.error({
    route,
    ip,
    userId: opts?.userId,
    status: opts?.status,
    error: error instanceof Error ? error.message : String(error),
  })
}
