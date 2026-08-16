"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type Hit = { id: string; kind: string; label: string; hint?: string; href: string }

export function AdminCommandSearch({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [hits, setHits] = useState<Hit[]>([])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setHits([])
      return
    }
    const t = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((data) => setHits(data.results ?? []))
        .catch(() => setHits([]))
    }, 180)
    return () => clearTimeout(t)
  }, [q, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#234A33]/25 px-4 pt-[12vh]">
      <button type="button" className="absolute inset-0" aria-label="Cerrar búsqueda" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-[24px] border border-[#E8E1D6] bg-[#FCFBF8] shadow-[0_8px_28px_-18px_rgba(35,74,51,0.28)]">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar lugares, marcas, usuarios, mensajes…"
          className="h-14 w-full border-b border-[#E8E1D6] bg-transparent px-4 text-base text-[#234A33] outline-none placeholder:text-[#6B746C]"
        />
        <ul className="max-h-80 overflow-y-auto py-2">
          {hits.length === 0 ? (
            <li className="px-4 py-3 text-sm text-[#6B746C]">
              {q.trim().length < 2 ? "Escribí al menos 2 letras." : "Sin resultados."}
            </li>
          ) : (
            hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  className="flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-[#F8F5EF]"
                  onClick={() => {
                    onClose()
                    router.push(hit.href)
                  }}
                >
                  <span className="text-sm text-[#234A33]">{hit.label}</span>
                  <span className="text-xs text-[#6B746C]">
                    {hit.kind}
                    {hit.hint ? ` · ${hit.hint}` : ""}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
