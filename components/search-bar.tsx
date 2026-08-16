"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Buscador home: una sola píldora; botón integrado. Alto 52–56px. */
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
      className="flex h-[52px] min-h-[52px] w-full min-w-0 items-center gap-2 overflow-hidden rounded-[18px] border border-[#D9DED4] bg-white py-1 pl-3 pr-1 shadow-[0_8px_28px_-16px_rgba(45,74,52,0.14)] focus-within:border-olive/25 focus-within:ring-2 focus-within:ring-olive/10 md:h-[56px] md:min-h-[56px] md:rounded-[20px] md:pl-4 md:pr-1.5"
      data-testid="home-search-bar"
    >
      <Search
        className="h-5 w-5 shrink-0 text-olive/55"
        strokeWidth={2}
        aria-hidden
      />
      <input
        type="text"
        placeholder="Buscar cafeterías, restaurantes o ciudades"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-base text-olive outline-none placeholder:text-olive/45"
        aria-label="Buscar cafeterías, restaurantes o ciudades"
      />
      <Button
        type="submit"
        className="h-10 min-h-[40px] shrink-0 rounded-[12px] bg-[#C85A2E] px-3.5 text-sm text-white shadow-none hover:bg-[#A84A26] md:h-11 md:min-h-[44px] md:rounded-[14px] md:px-5 sm:px-6"
      >
        Buscar
      </Button>
    </form>
  )
}
