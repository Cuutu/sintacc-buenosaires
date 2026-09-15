"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { VentureItem } from "./types"
import { adminUi } from "@/lib/admin-ui"

export function VentureContactEditModal({ venture, onClose, onSaved }: { venture: VentureItem; onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState(venture.responsibleEmail || "")
  const [instagram, setInstagram] = useState(venture.contact?.instagram || "")
  const [whatsapp, setWhatsapp] = useState(venture.contact?.whatsapp || "")
  const [busy, setBusy] = useState(false)
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}>
    <DialogContent className="w-[calc(100%-2rem)] rounded-3xl [&>button]:min-h-11 [&>button]:min-w-11">
      <DialogTitle>Editar contacto: {venture.name}</DialogTitle>
      <DialogDescription>El email del responsable es privado. Instagram y WhatsApp son los canales públicos del emprendimiento.</DialogDescription>
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault()
        setBusy(true)
        try {
          const res = await fetch(`/api/admin/ventures/${venture._id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ responsibleEmail: email.trim(), contact: { instagram, whatsapp } }),
          })
          if (!res.ok) throw new Error("No se pudieron guardar los datos")
          toast.success("Contacto actualizado")
          onSaved()
          onClose()
        } catch (error) { toast.error(error instanceof Error ? error.message : "Error al guardar") }
        finally { setBusy(false) }
      }}>
        <label className="block text-sm">Email del responsable
          <input type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border p-3" />
        </label>
        <label className="block text-sm">Instagram
          <input maxLength={500} value={instagram} onChange={e => setInstagram(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border p-3" />
        </label>
        <label className="block text-sm">WhatsApp
          <input type="tel" maxLength={50} value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border p-3" />
        </label>
        <button type="submit" disabled={busy} className={adminUi.btnPrimary}>{busy ? "Guardando…" : "Guardar cambios"}</button>
      </form>
    </DialogContent>
  </Dialog>
}
