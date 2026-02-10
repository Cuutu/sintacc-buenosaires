"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star } from "lucide-react"

interface ReviewFormProps {
  placeId: string
  onSuccess?: () => void
}

export function ReviewForm({ placeId, onSuccess }: ReviewFormProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [safeFeeling, setSafeFeeling] = useState(true)
  const [separateKitchen, setSeparateKitchen] = useState<"yes" | "no" | "unknown">("unknown")
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (!session) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="mb-4">Debes iniciar sesión para escribir una reseña</p>
          <Button onClick={() => router.push("/login")}>Iniciar sesión</Button>
        </CardContent>
      </Card>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId,
          rating,
          safeFeeling,
          separateKitchen,
          comment,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al crear reseña")
      }

      // Reset form
      setRating(0)
      setSafeFeeling(true)
      setSeparateKitchen("unknown")
      setComment("")
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escribir reseña</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-base">Calificación</Label>
            <div className="flex gap-2 mt-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="min-h-[48px] min-w-[48px] p-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Star
                    className={`h-10 w-10 md:h-8 md:w-8 ${
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
            <Label className="text-base">¿Te sentiste seguro comiendo aquí?</Label>
            <div className="flex gap-4 mt-3">
              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="radio"
                  checked={safeFeeling}
                  onChange={() => setSafeFeeling(true)}
                  className="w-5 h-5"
                />
                <span className="text-base">Sí</span>
              </label>
              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="radio"
                  checked={!safeFeeling}
                  onChange={() => setSafeFeeling(false)}
                  className="w-5 h-5"
                />
                <span className="text-base">No</span>
              </label>
            </div>
          </div>

          <div>
            <Label className="text-base">Cocina separada</Label>
            <Select
              value={separateKitchen}
              onValueChange={(value: "yes" | "no" | "unknown") =>
                setSeparateKitchen(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Sí</SelectItem>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="unknown">No sé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-base">Comentario</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comparte tu experiencia..."
              rows={4}
              maxLength={800}
              required
              className="min-h-[120px] text-base"
            />
            <p className="text-sm text-muted-foreground mt-1">
              {comment.length}/800 caracteres
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || rating === 0 || !comment.trim()}
            className="w-full min-h-[48px] text-base"
          >
            {loading ? "Enviando..." : "Publicar reseña"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
