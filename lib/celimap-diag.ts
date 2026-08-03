/**
 * Diagnóstico de mounts (e2e/dev). Sin PII. No logs.
 * Contadores solo con NODE_ENV=development, NEXT_PUBLIC_CELIMAP_DIAG=1 o window.__CELIMAP_DIAG__.
 */
export type CelimapDiag = {
  layoutChromeMounts: number
  clientErrorListenerMounts: number
  listenerAttachCycles: number
}

declare global {
  interface Window {
    __celimapDiag?: CelimapDiag
    __CELIMAP_DIAG__?: boolean
  }
}

function diagEnabled(): boolean {
  if (typeof window === "undefined") return false
  if (window.__CELIMAP_DIAG__ === true) return true
  if (process.env.NEXT_PUBLIC_CELIMAP_DIAG === "1") return true
  return process.env.NODE_ENV === "development"
}

export function bumpDiag(field: keyof CelimapDiag): void {
  if (!diagEnabled()) return
  const d = window.__celimapDiag || {
    layoutChromeMounts: 0,
    clientErrorListenerMounts: 0,
    listenerAttachCycles: 0,
  }
  d[field] += 1
  window.__celimapDiag = d
}

export function readDiag(): CelimapDiag | null {
  if (typeof window === "undefined") return null
  return window.__celimapDiag ?? null
}
