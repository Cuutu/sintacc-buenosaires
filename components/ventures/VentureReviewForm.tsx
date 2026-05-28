"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"

type VentureReviewFormProps = {
  ventureId: string
  onSuccess?: () => void
}

export function VentureReviewForm({ ventureId, onSuccess }: VentureReviewFormProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (!session) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            Iniciá sesión para dejar tu experiencia
          </p>
          <Button
            onClick={() =>
              router.push(`/login?callbackUrl=/emprendimientos/${ventureId}`)
            }
          >
            Iniciar sesión
          </Button>
        </CardContent>
      </Card>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/venture-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ventureId, rating, comment }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al publicar")

      setRating(0)
      setComment("")
      onSuccess?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al publicar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Tu experiencia</CardTitle>
        <p className="text-xs text-muted-foreground font-normal">
          Contá si compraste, qué probaste y cómo te fue. Ayuda a otros celíacos.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Calificación</Label>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="min-h-[44px] min-w-[44px] p-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`${star} estrellas`}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="venture-comment">Comentario</Label>
            <Textarea
              id="venture-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ej: Pedí torta de cumpleaños, llegó bien etiquetada y sin contaminación..."
              rows={4}
              maxLength={800}
              required
              className="mt-2 min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground mt-1">{comment.length}/800</p>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading || rating === 0 || !comment.trim()}
            className="w-full min-h-[48px]"
          >
            {loading ? "Publicando..." : "Publicar reseña"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
