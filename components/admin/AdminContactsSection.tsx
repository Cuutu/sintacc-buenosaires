"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import type { ContactItem } from "@/components/admin/types"
import { daysSince } from "@/lib/admin-quality"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"
import { AdminEstadoActions, AdminEstadoFilter } from "./AdminEstadoControls"
import { contactReplyUrl } from "@/lib/admin-estado"

export type AdminContactsSectionProps = {
  estadoFilter: string
  onEstadoFilter: (value: string) => void
  contacts: ContactItem[]
  contactsLoading: boolean
  contactSearch: string
  setContactSearch: (v: string) => void
  fetchContacts: () => void
}

export function AdminContactsSection(props: AdminContactsSectionProps) {
  const { contacts, contactsLoading, contactSearch, setContactSearch, fetchContacts } = props
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const visible = contacts

  const selected = visible.find((c) => c._id === selectedId) ?? visible[0]

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className={adminUi.card}>
        <div className="border-b border-[#E8E1D6] p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B746C]" />
              <input
                placeholder="Buscar por nombre, email, mensaje..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchContacts()}
                className="h-11 w-full rounded-2xl border border-[#E8E1D6] bg-[#F8F5EF] pl-9 pr-3 text-sm text-[#234A33] outline-none"
              />
            </div>
            <button type="button" className={adminUi.btnGhost} onClick={() => fetchContacts()}>
              Buscar
            </button>
          </div>
          <AdminEstadoFilter value={props.estadoFilter} onChange={props.onEstadoFilter} />
        </div>
        {contactsLoading ? (
          <p className="px-5 py-10 text-center text-sm text-[#6B746C]">Cargando mensajes...</p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[#6B746C]">No hay mensajes</p>
        ) : (
          <ul>
            {visible.map((c) => (
              <li key={c._id} className="border-b border-[#E8E1D6] last:border-0">
                <button
                  type="button"
                  onClick={() => setSelectedId(c._id)}
                  className={cn(
                    "flex w-full flex-col items-start px-5 py-4 text-left transition-colors duration-150",
                    selected?._id === c._id ? "bg-[#F8F5EF]" : "hover:bg-[#F8F5EF]"
                  )}
                >
                  <span className="text-sm font-semibold text-[#234A33]">{c.subject}</span>
                  <span className="mt-1 text-xs text-[#6B746C]">
                    {c.name} · {c.estado ?? "pendiente"}
                    {(c.estado ?? "pendiente") === "pendiente" && daysSince(c.createdAt) != null && daysSince(c.createdAt)! >= 2
                      ? ` · ${daysSince(c.createdAt)} días sin resolver`
                      : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className={cn(adminUi.card, "p-5")}>
        {selected ? (
          <>
            <p className="font-display text-xl font-extrabold text-[#234A33]">{selected.subject}</p>
            <p className="mt-1 text-sm text-[#6B746C]">
              {selected.name} · {selected.email}
            </p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#234A33]">
              {selected.message}
            </p>
            <AdminEstadoActions key={selected._id} endpoint={`/api/admin/contacts/${selected._id}`} estado={selected.estado} onSaved={fetchContacts} />
            {selected.email ? <a
              href={contactReplyUrl(selected.email, selected.subject, selected.message)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(adminUi.btnPrimary, "mt-6")}
            >
              Responder
            </a> : <button disabled title="Sin datos de contacto" className={adminUi.btnGhost}>Responder</button>}
          </>
        ) : (
          <p className="text-sm text-[#6B746C]">Elegí un mensaje para responder.</p>
        )}
      </aside>
    </div>
  )
}
