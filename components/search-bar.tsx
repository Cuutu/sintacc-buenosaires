"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { openCeliBot } from "@/lib/celibot-open"

/**
 * Buscador home: una sola píldora blanca con botón integrado.
 * En el rediseño Edición queda montado sobre el borde inferior del hero oliva.
 * Debajo, la entrada a CeliBot (en mobile ya no flota en el inicio): si hay texto
 * escrito, se lo pasa como pregunta precargada.
 */
export function SearchBar() {
  const [query, setQuery] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/mapa?search=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div className="min-w-0">
      <form
        onSubmit={handleSubmit}
        className="flex h-[60px] min-h-[60px] w-full min-w-0 items-center gap-2 overflow-hidden rounded-[22px] bg-white py-1.5 pl-4 pr-1.5 shadow-[0_18px_40px_-16px_rgba(31,42,34,0.45),0_0_0_1px_rgba(45,74,52,0.06)] focus-within:ring-2 focus-within:ring-olive/15 md:h-[64px] md:min-h-[64px] md:pl-5"
        data-testid="home-search-bar"
      >
        <Search className="h-5 w-5 shrink-0 text-olive" strokeWidth={2.1} aria-hidden />
        <input
          type="text"
          placeholder="Buscá un lugar o una ciudad"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-olive outline-none placeholder:font-semibold placeholder:text-olive/45"
          aria-label="Buscar lugares o ciudades"
        />
        <Button
          type="submit"
          className="h-12 min-h-[48px] shrink-0 rounded-[16px] bg-[#B84420] px-4 text-sm font-extrabold text-white shadow-none hover:bg-[#9A3A1B] md:px-6"
        >
          Buscar
        </Button>
      </form>
      <button
        type="button"
        onClick={() => openCeliBot(query)}
        className="mt-2.5 inline-flex min-h-[44px] max-w-full items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-left text-[14px] font-semibold text-[#2D4A34]/80 transition-colors hover:text-[#2D4A34] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/30"
        data-testid="home-celibot-entry"
      >
        <Image
          src="/brand/celibot-192.webp"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-full bg-white object-contain p-0.5 shadow-[0_2px_8px_-3px_rgba(31,42,34,0.35)]"
        />
        <span className="min-w-0 truncate">
          ¿Dudas? <span className="text-[#B84420] underline decoration-[#B84420]/30 underline-offset-4">Preguntale a CeliBot</span>
        </span>
      </button>
    </div>
  )
}
