"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import type { ContactItem } from "@/components/admin/types"

export type AdminContactsSectionProps = {
  contacts: ContactItem[]
  contactsLoading: boolean
  contactSearch: string
  setContactSearch: (v: string) => void
  fetchContacts: () => void
}

export function AdminContactsSection(props: AdminContactsSectionProps) {
const {
  contacts,
  contactsLoading,
  contactSearch,
  setContactSearch,
  fetchContacts,
} = props
  return (
  <div className="rounded-xl border border-border overflow-hidden">
    <div className="px-4 py-3 border-b border-border bg-card">
      <h2 className="text-sm font-bold">✉️ Mensajes de contacto</h2>
      <p className="text-xs text-muted-foreground mt-0.5">
        Mensajes que los usuarios te enviaron desde la página de contacto
      </p>
    </div>
    <div className="px-4 py-2 border-b border-border bg-card/50 flex gap-2">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email, mensaje..."
          value={contactSearch}
          onChange={(e) => setContactSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchContacts()}
          className="pl-8 h-8 text-sm"
        />
      </div>
      <Button size="sm" variant="secondary" className="h-8" onClick={() => fetchContacts()}>
        Buscar
      </Button>
    </div>
    {contactsLoading ? (
      <div className="text-center py-10 text-muted-foreground text-sm">Cargando mensajes...</div>
    ) : contacts.length === 0 ? (
      <div className="text-center py-10 text-muted-foreground">
        <div className="text-3xl mb-2">📭</div>
        <p className="text-sm">No hay mensajes de contacto</p>
      </div>
    ) : (
      <div className="divide-y divide-border">
        {contacts.map((c) => (
          <div key={c._id} className="p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-bold">{c.subject}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.name} · {c.email}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {new Date(c.createdAt).toLocaleDateString("es-AR")}
                </span>
                <a href={`mailto:${c.email}?subject=Re: ${encodeURIComponent(c.subject)}`}>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    ✉️ Responder
                  </Button>
                </a>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {c.message}
            </p>
          </div>
        ))}
      </div>
    )}
  </div>

  )
}
