"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Buscador de la home: una sola píldora blanca con botón integrado. Desde la
 * revisión del 20/10 es la acción principal del hero y va adentro del verde.
 * (La entrada a CeliBot pasó a las preguntas frecuentes.)
 */
export function SearchBar({ className }: { className?: string }) {
  const [query, setQuery] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/mapa?search=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={cn(
        "flex h-[60px] min-h-[60px] w-full min-w-0 items-center gap-2 overflow-hidden rounded-[20px] bg-white py-1.5 pl-4 pr-1.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.5)] focus-within:ring-2 focus-within:ring-[#F7F3EB]/60 md:h-[64px] md:min-h-[64px] md:pl-5",
        className
      )}
      data-testid="home-search-bar"
    >
      <Search className="h-5 w-5 shrink-0 text-olive" strokeWidth={2.1} aria-hidden />
      <input
        type="text"
        placeholder="Buscá un lugar o ciudad"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-base font-bold text-olive outline-none placeholder:font-bold placeholder:text-olive/45"
        aria-label="Buscar lugares o ciudades"
      />
      <button
        type="submit"
        className="inline-flex h-12 shrink-0 items-center justify-center rounded-[16px] bg-[#B84420] px-4 text-base font-extrabold text-white transition-colors hover:bg-[#9A3A1B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B84420]/40 md:px-6"
      >
        Buscar
      </button>
    </form>
  )
}
