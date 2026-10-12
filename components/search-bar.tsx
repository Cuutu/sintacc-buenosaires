"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Buscador home: una sola píldora blanca con botón integrado.
 * En el rediseño Edición queda montado sobre el borde inferior del hero oliva.
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
  )
}
