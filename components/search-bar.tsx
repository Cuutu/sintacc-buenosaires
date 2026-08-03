"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Buscador home: en 320px input+botón se apilan; ≥sm en fila. */
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
      className="flex w-full min-w-0 flex-col gap-2 sm:flex-row"
      data-testid="home-search-bar"
    >
      <div className="relative min-w-0 flex-1 group">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <Input
          type="text"
          placeholder="Buscar lugares, direcciones, localidades..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 min-h-[48px] rounded-xl border-border/50 bg-card/50 pl-11 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          aria-label="Buscar lugares"
        />
      </div>
      <Button
        type="submit"
        size="lg"
        className="h-12 min-h-[48px] w-full shrink-0 rounded-xl px-6 sm:w-auto"
      >
        Buscar
      </Button>
    </form>
  )
}
