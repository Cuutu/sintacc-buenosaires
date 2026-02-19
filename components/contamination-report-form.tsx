"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface ContaminationReportFormProps {
  placeId: string
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function ContaminationReportForm({
  placeId,
  onSuccess,
  trigger,
}: ContaminationReportFormProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) {
      router.push("/login")
      return
    }
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/contamination-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId, comment: comment.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al enviar el reporte")
      }

      toast.success("Gracias por ayudar a la comunidad. Tu reporte fue registrado.")
      setComment("")
      setOpen(false)
      onSuccess?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const defaultTrigger = (
    <Button variant="outline" className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10 min-h-[44px]">
      <AlertTriangle className="h-4 w-4 mr-2" />
      Reportar contaminación
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Reportar contaminación
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Contá tu experiencia para que otros celíacos estén informados. Tu reporte se mostrará de forma anónima.
          </p>
        </DialogHeader>
        {session ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="contamination-comment">
                ¿Qué te pasó? Contá tu experiencia
              </Label>
              <Textarea
                id="contamination-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ej: Pedí milanesa sin TACC y llegó con empanizado. Tuve reacción..."
                className="mt-2 min-h-[120px]"
                maxLength={1000}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {comment.length}/1000 caracteres
              </p>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || comment.trim().length < 10}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {loading ? "Enviando..." : "Enviar reporte"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-4 text-center">
            <p className="mb-4">Iniciá sesión para reportar una contaminación</p>
            <Button onClick={() => router.push("/login")}>Iniciar sesión</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
