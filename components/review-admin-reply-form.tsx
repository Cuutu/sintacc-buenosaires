"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ADMIN_REPLY_DISPLAY_NAME } from "@/lib/constants"
import { toast } from "sonner"

type ReviewAdminReplyFormProps = {
  reviewId: string
  existingReply?: string
  onSuccess?: () => void
  compact?: boolean
}

export function ReviewAdminReplyForm({
  reviewId,
  existingReply,
  onSuccess,
  compact = false,
}: ReviewAdminReplyFormProps) {
  const [open, setOpen] = useState(false)
  const [reply, setReply] = useState(existingReply || "")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const trimmed = reply.trim()
    if (trimmed.length < 1) {
      toast.error("Escribí una respuesta")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", reply: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al publicar respuesta")
      toast.success("Respuesta publicada")
      setOpen(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error(err.message || "Error al publicar respuesta")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("¿Eliminar tu respuesta pública?")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_reply" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al eliminar respuesta")
      toast.success("Respuesta eliminada")
      setReply("")
      setOpen(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar respuesta")
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`gap-1.5 text-xs ${compact ? "h-7" : "h-8"} border-primary/25 text-primary hover:bg-primary/8`}
        onClick={() => {
          setReply(existingReply || "")
          setOpen(true)
        }}
      >
        {existingReply ? "Editar respuesta" : "Responder como Celimap"}
      </Button>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.03] p-3 space-y-2">
      <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">
        Respondiendo como {ADMIN_REPLY_DISPLAY_NAME}
      </p>
      <Textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="Gracias por tu reseña. Te contamos que..."
        className="min-h-[88px] text-sm"
        maxLength={800}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={loading || reply.trim().length < 1}
          onClick={handleSubmit}
        >
          {loading ? "Guardando..." : existingReply ? "Actualizar respuesta" : "Publicar respuesta"}
        </Button>
        {existingReply && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading}
            className="text-destructive border-destructive/30 hover:bg-destructive/8"
            onClick={handleDelete}
          >
            Eliminar
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={loading}
          onClick={() => {
            setReply(existingReply || "")
            setOpen(false)
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
