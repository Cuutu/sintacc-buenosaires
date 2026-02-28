"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ListCard, type ListWithDetails } from "@/components/lists/ListCard"
import { fetchApi } from "@/lib/fetchApi"
import { ListPlus, ArrowLeft } from "lucide-react"
import { useSession } from "next-auth/react"

export default function ListasPage() {
  const { data: session } = useSession()
  const [lists, setLists] = useState<ListWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchApi<{ lists: ListWithDetails[] }>("/api/lists")
      .then((data) => setLists(data.lists ?? []))
      .catch(() => setLists([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Link>

      <h1 className="text-3xl font-bold mb-2">Listas de la comunidad</h1>
      <p className="text-muted-foreground mb-8">
        Descubrí listas creadas por otros celíacos. Dale like a las que te
        gusten.
      </p>

      {loading ? (
        <div className="text-center py-12">Cargando...</div>
      ) : lists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-4">
            <p>Todavía no hay listas públicas.</p>
            {session ? (
              <Button asChild className="gap-2">
                <Link href="/favoritos">
                  <ListPlus className="h-4 w-4" />
                  Crear la primera lista
                </Link>
              </Button>
            ) : (
              <p className="text-sm">
                Iniciá sesión y creá una lista desde tus favoritos.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map((list) => (
            <ListCard key={list._id} list={list} />
          ))}
        </div>
      )}
    </div>
  )
}
