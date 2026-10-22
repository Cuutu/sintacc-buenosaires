"use client"

import { useEffect, useRef, useState } from "react"
import { Mail, Search } from "lucide-react"
import type { ContactItem } from "@/components/admin/types"
import { daysSince } from "@/lib/admin-quality"
import { adminUi } from "@/lib/admin-ui"
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin-format"
import { cn } from "@/lib/utils"
import { contactReplyUrl } from "@/lib/admin-estado"
import { AdminButton, AdminLinkButton } from "@/components/admin/ui/button"
import { StatusBadge } from "@/components/admin/ui/status-badge"
import { AdminEmptyState, AdminListSkeleton } from "@/components/admin/ui/states"
import { AdminEstadoActions, AdminEstadoBadge, AdminEstadoFilter } from "./AdminEstadoControls"

export type AdminContactsSectionProps = {
  estadoFilter: string
  onEstadoFilter: (value: string) => void
  contacts: ContactItem[]
  contactsLoading: boolean
  contactSearch: string
  setContactSearch: (v: string) => void
  fetchContacts: () => void
}

/** Sin respuesta todavía = nuevo (los mensajes viejos sin estado cuentan como pendientes). */
function isUnread(c: ContactItem) {
  return (c.estado ?? "pendiente") === "pendiente"
}

export function AdminContactsSection(props: AdminContactsSectionProps) {
  const { contacts, contactsLoading, contactSearch, setContactSearch, fetchContacts } = props
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = contacts.find((c) => c._id === selectedId) ?? contacts[0]
  const detailRef = useRef<HTMLElement>(null)

  // Busca sola mientras se escribe (salteando el primer render).
  const mounted = useRef(false)
  const fetchRef = useRef(fetchContacts)
  fetchRef.current = fetchContacts
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const t = setTimeout(() => fetchRef.current(), 400)
    return () => clearTimeout(t)
  }, [contactSearch])

  const unreadCount = contacts.filter(isUnread).length

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className={cn(adminUi.card, "overflow-hidden")} aria-label="Bandeja de mensajes">
        <div className="space-y-3 border-b border-line px-5 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              type="search"
              aria-label="Buscar mensajes"
              placeholder="Buscar por nombre, email o mensaje"
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchContacts()}
              className={cn(adminUi.input, "pl-9")}
            />
          </div>
          <div className="flex">
            <AdminEstadoFilter value={props.estadoFilter} onChange={props.onEstadoFilter} />
          </div>
          {!contactsLoading && unreadCount > 0 ? (
            <p className="text-sm text-ink-muted">
              {unreadCount === 1 ? "1 mensaje sin responder" : `${unreadCount} mensajes sin responder`}
            </p>
          ) : null}
        </div>
        {contactsLoading ? (
          <AdminListSkeleton rows={4} label="Cargando mensajes…" />
        ) : contacts.length === 0 ? (
          <AdminEmptyState title="No hay mensajes con estos filtros" />
        ) : (
          <ul className="divide-y divide-line">
            {contacts.map((c) => {
              const unread = isUnread(c)
              const days = daysSince(c.createdAt)
              const isSelected = selected?._id === c._id
              return (
                <li key={c._id}>
                  <button
                    type="button"
                    aria-current={isSelected ? "true" : undefined}
                    onClick={() => {
                      setSelectedId(c._id)
                      // En el celular el detalle queda abajo: lo traemos a la vista.
                      if (window.matchMedia?.("(max-width: 1023px)").matches) {
                        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 px-5 py-4 text-left transition-colors duration-150",
                      isSelected ? "bg-cream" : "hover:bg-cream"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", unread ? "bg-terracotta-strong" : "bg-transparent")}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={cn("truncate text-sm text-olive", unread ? "font-bold" : "font-medium")}>
                          {unread ? <span className="sr-only">Nuevo: </span> : null}
                          {c.name || c.email || "Sin nombre"}
                        </span>
                        <time dateTime={c.createdAt} className="shrink-0 text-xs tabular-nums text-ink-muted">
                          {formatAdminDate(c.createdAt)}
                        </time>
                      </span>
                      <span className={cn("mt-0.5 block truncate text-sm", unread ? "font-semibold text-olive" : "text-ink-muted")}>
                        {c.subject || "Sin asunto"}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-muted">{c.message}</span>
                      {unread ? (
                        <span className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusBadge tone="warning">Pendiente</StatusBadge>
                          {days != null && days >= 2 ? (
                            <span className="text-xs font-medium text-warning">{days} días sin resolver</span>
                          ) : null}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <aside ref={detailRef} className={cn(adminUi.card, "scroll-mt-24 p-5")} aria-label="Mensaje elegido">
        {selected ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="min-w-0 font-display text-xl font-extrabold text-olive">{selected.subject || "Sin asunto"}</h2>
              <AdminEstadoBadge estado={selected.estado} />
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {selected.name}
              {selected.email ? ` · ${selected.email}` : ""}
            </p>
            <p className="mt-0.5 text-sm text-ink-muted">
              <time dateTime={selected.createdAt}>{formatAdminDateTime(selected.createdAt)}</time>
            </p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-olive">{selected.message}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {selected.email ? (
                <AdminLinkButton
                  href={contactReplyUrl(selected.email, selected.subject, selected.message)}
                  variant="primary"
                  external
                >
                  <Mail className="h-4 w-4" aria-hidden />
                  Responder por email
                </AdminLinkButton>
              ) : (
                <AdminButton disabled title="Sin datos de contacto">
                  Responder por email
                </AdminButton>
              )}
              <AdminEstadoActions
                key={selected._id}
                endpoint={`/api/admin/contacts/${selected._id}`}
                estado={selected.estado}
                onSaved={fetchContacts}
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-muted">Elegí un mensaje para leerlo y responder.</p>
        )}
      </aside>
    </div>
  )
}
