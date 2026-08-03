"use client"

import { useEffect } from "react"
import { reportClientError } from "@/lib/client-error-reporter"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportClientError(error, "global-error", { digest: error.digest })
  }, [error])

  return (
    <html lang="es">
      <body style={{ margin: 0, background: "#0a0f0c", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Celimap tuvo un problema</p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", margin: 0, maxWidth: 360 }}>
            Tocá reintentar. Si sigue fallando, cerrá y abrí la app de nuevo.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                borderRadius: 999,
                border: "none",
                background: "#10b981",
                color: "#04140e",
                fontWeight: 700,
                padding: "10px 16px",
                cursor: "pointer",
              }}
            >
              Reintentar
            </button>
            <a
              href="/"
              style={{
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.04)",
                color: "#fff",
                fontWeight: 600,
                padding: "10px 16px",
                textDecoration: "none",
              }}
            >
              Ir al inicio
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
