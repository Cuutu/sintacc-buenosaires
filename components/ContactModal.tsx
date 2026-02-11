"use client"

import * as React from "react"
import { useSession, signIn } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"

interface ContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactModal({ open, onOpenChange }: ContactModalProps) {
  const { data: session, status } = useSession()
  const [subject, setSubject] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const resetForm = () => {
    setSubject("")
    setMessage("")
    setSuccess(false)
    setError(null)
  }

  React.useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al enviar")
      setSuccess(true)
      setTimeout(() => onOpenChange(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar")
    } finally {
      setLoading(false)
    }
  }

  const isAuthenticated = status === "authenticated"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contacto</DialogTitle>
          <DialogDescription>
            {isAuthenticated
              ? "Escribinos tu consulta y te responderemos lo antes posible."
              : "Iniciá sesión para enviarnos tu consulta."}
          </DialogDescription>
        </DialogHeader>

        {!isAuthenticated ? (
          <div className="flex flex-col gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              Necesitás estar logueado para contactarnos. Así podemos responderte
              directamente.
            </p>
            <Button onClick={() => signIn("google")} className="w-full">
              Iniciar sesión con Google
            </Button>
          </div>
        ) : success ? (
          <div className="py-6 text-center">
            <p className="text-primary font-medium">¡Mensaje enviado!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Te responderemos a la brevedad.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="contact-email">Tu email</Label>
              <Input
                id="contact-email"
                type="email"
                value={session?.user?.email ?? ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-subject">Asunto</Label>
              <Input
                id="contact-subject"
                placeholder="Ej: Consulta sobre un lugar"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">Mensaje</Label>
              <Textarea
                id="contact-message"
                placeholder="Escribí tu consulta..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                maxLength={2000}
                rows={4}
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {message.length}/2000
              </p>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar mensaje"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
