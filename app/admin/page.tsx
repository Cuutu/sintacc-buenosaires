"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ISuggestion } from "@/models/Suggestion"
import { IReview } from "@/models/Review"

export default function AdminPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<ISuggestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/")
      return
    }
    fetchSuggestions()
  }, [session, router])

  const fetchSuggestions = async () => {
    try {
      const res = await fetch("/api/admin/suggestions?status=pending")
      const data = await res.json()
      setSuggestions(data.suggestions || [])
    } catch (error) {
      console.error("Error fetching suggestions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionAction = async (id: string, action: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/admin/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (res.ok) {
        fetchSuggestions()
      }
    } catch (error) {
      console.error("Error processing suggestion:", error)
    }
  }

  if (session?.user?.role !== "admin") {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Panel de administración</h1>

      <Tabs defaultValue="suggestions">
        <TabsList>
          <TabsTrigger value="suggestions">
            Sugerencias pendientes ({suggestions.length})
          </TabsTrigger>
          <TabsTrigger value="reviews">Reseñas</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-4">
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : suggestions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay sugerencias pendientes
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion: any) => (
                <Card key={suggestion._id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{suggestion.placeDraft.name}</CardTitle>
                      <Badge variant="secondary">
                        {suggestion.suggestedByUserId?.name || "Usuario"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <p>
                        <strong>Tipo:</strong> {suggestion.placeDraft.type}
                      </p>
                      <p>
                        <strong>Dirección:</strong> {suggestion.placeDraft.address}
                      </p>
                      <p>
                        <strong>Barrio:</strong> {suggestion.placeDraft.neighborhood}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSuggestionAction(suggestion._id, "approve")}
                        variant="default"
                      >
                        Aprobar
                      </Button>
                      <Button
                        onClick={() => handleSuggestionAction(suggestion._id, "reject")}
                        variant="destructive"
                      >
                        Rechazar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Gestión de reseñas (próximamente)
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
