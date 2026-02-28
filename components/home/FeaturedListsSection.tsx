"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ListCard, type ListWithDetails } from "@/components/lists/ListCard"
import { fetchApi } from "@/lib/fetchApi"
import { List } from "lucide-react"

export function FeaturedListsSection() {
  const [lists, setLists] = useState<ListWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchApi<{ lists: ListWithDetails[] }>("/api/lists/top?limit=6")
      .then((data) => setLists(data.lists ?? []))
      .catch(() => setLists([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading || lists.length === 0) return null

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Listas destacadas</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Listas creadas por la comunidad · Dale like a tus favoritas
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="w-fit shrink-0">
          <Link href="/listas" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Ver todas
          </Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {lists.map((list) => (
          <ListCard key={list._id} list={list} />
        ))}
      </div>
    </section>
  )
}
