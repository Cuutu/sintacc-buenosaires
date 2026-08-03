"use client"

import { useEffect, useState } from "react"
import { isNativeApp } from "@/lib/native-app"

/**
 * Banner persistente solo en Preview/Staging.
 * Nunca en producción (www.celimap.com.ar / VERCEL_ENV=production).
 */
export function PreviewBadge() {
  const [show, setShow] = useState(false)
  const [meta, setMeta] = useState({ host: "", build: "", env: "" })

  useEffect(() => {
    const env = process.env.NEXT_PUBLIC_VERCEL_ENV || ""
    const host = typeof window !== "undefined" ? window.location.host : ""
    const sha = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "").slice(0, 7)
    const isProdHost =
      host === "www.celimap.com.ar" || host === "celimap.com.ar"
    const isPreviewEnv = env === "preview" || env === "development"
    const force =
      typeof window !== "undefined" &&
      Boolean(
        (window as Window & { __CELIMAP_FORCE_PREVIEW_BADGE__?: boolean })
          .__CELIMAP_FORCE_PREVIEW_BADGE__
      )

    if (force || (isPreviewEnv && !isProdHost) || (isNativeApp() && !isProdHost && env !== "production")) {
      setShow(true)
      setMeta({
        host,
        build: sha || "local",
        env: env || "unknown",
      })
    }
  }, [])

  if (!show) return null

  return (
    <div
      role="status"
      aria-label="Entorno preview"
      data-preview-badge="1"
      className="pointer-events-none fixed left-0 right-0 top-0 z-[100] flex justify-center pt-[max(0.25rem,env(safe-area-inset-top))]"
    >
      <span className="rounded-b-md bg-amber-500/95 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-black shadow">
        Preview · {meta.env} · {meta.build}
        {meta.host ? ` · ${meta.host}` : ""}
      </span>
    </div>
  )
}
