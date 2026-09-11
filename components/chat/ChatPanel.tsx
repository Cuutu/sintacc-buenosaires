"use client"

import { ArrowLeft, ArrowUp, X } from "lucide-react"
import { useChat } from "@ai-sdk/react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState, type FormEvent, type UIEvent } from "react"
import {
  ChatListCards,
  ChatPlaceCards,
  ChatPlaceMiniCards,
  chatZonaFromInput,
  mergePlaceCards,
} from "@/components/chat/ChatCards"
import { ChatMarkdown } from "@/components/chat/ChatMarkdown"
import { chatMessageText, loadChatHistory, saveChatHistory } from "@/components/chat/storage"
import type { BuscarListasResult } from "@/lib/chat/buscar-listas"
import type { BuscarLugaresInput, BuscarLugaresResult } from "@/lib/chat/buscar-lugares"
import { parseChatClientErrorMessage } from "@/lib/chat/errors"
import { isCercaMioQuery } from "@/lib/chat/normalize-zona"
import { extractChatPlaceLinks, stripChatPlaceLinkMarkdown } from "@/lib/chat/place-links"
import { getChatToolInput, getChatToolOutput } from "@/lib/chat/ui-parts"
import { cn } from "@/lib/utils"
import type { UIMessage } from "ai"
import "@/components/chat/chat-ui.css"

const CHIPS = [
  { icon: "📍", label: "100% sin TACC en Palermo", send: "Lugares 100% sin TACC en Palermo" },
  { icon: "🔍", label: "¿Qué es la contaminación cruzada?", send: "¿Qué es la contaminación cruzada?" },
  { icon: "☕", label: "Cafeterías cerca mío", send: "Cafeterías cerca mío" },
] as const

const BARRIO_CHIPS = ["Palermo", "Belgrano", "Recoleta", "San Telmo", "Caballito"] as const

const BOT_BUBBLE =
  "rounded-[18px] rounded-tl-[4px] border border-[#EDEBE7] bg-white px-[18px] py-[14px] text-[14px] leading-relaxed text-[#333] shadow-[0_1px_4px_rgba(0,0,0,0.06)]"

const USER_BUBBLE =
  "rounded-[18px] rounded-br-[4px] bg-[#1F4D35] px-[18px] py-[14px] text-[14px] leading-relaxed text-white"

type ChatPanelProps = {
  variant: "widget" | "page"
  onClose?: () => void
}

function requestBrowserLocation(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 }
    )
  })
}

function assistantHasBody(message: UIMessage): boolean {
  const text = chatMessageText(message)
  if (text) return true
  const places = getChatToolOutput<BuscarLugaresResult>(message, "buscarLugares")
  const lists = getChatToolOutput<BuscarListasResult>(message, "buscarListas")
  return Boolean((places && places.lugares.length > 0) || (lists && lists.listas.length > 0))
}

function cercaFollowUp(original: string, barrio: string): string {
  if (/cafet/i.test(original)) return `Cafeterías en ${barrio}`
  return `Lugares sin TACC en ${barrio}`
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })
}

const CELIBOT_SRC = "/brand/celibot.png"

function ChatAvatar() {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F7F3EB] shadow-[0_1px_3px_rgba(31,77,53,0.18)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CELIBOT_SRC}
        alt=""
        width={44}
        height={44}
        className="h-[42px] w-[42px] object-contain"
      />
    </span>
  )
}

function BubbleTime({ at, side }: { at: Date; side: "left" | "right" }) {
  return (
    <p className={cn("mt-1 text-[11px] text-[#AAA]", side === "right" ? "text-right" : "text-left")}>
      {formatClock(at)}
    </p>
  )
}

export function ChatPanel({ variant, onClose }: ChatPanelProps) {
  const [bootMessages, setBootMessages] = useState<ReturnType<typeof loadChatHistory> | null>(null)

  useEffect(() => {
    setBootMessages(loadChatHistory())
  }, [])

  if (bootMessages === null) {
    return <div className="flex h-full w-full flex-col bg-[#F7F3EB]" aria-busy="true" />
  }

  return <ChatPanelLive variant={variant} onClose={onClose} initialMessages={bootMessages} />
}

function ChatPanelLive({
  variant,
  onClose,
  initialMessages,
}: ChatPanelProps & { initialMessages: ReturnType<typeof loadChatHistory> }) {
  const [input, setInput] = useState("")
  const [locating, setLocating] = useState(false)
  const [blockedCerca, setBlockedCerca] = useState<string | null>(null)
  const startedEmpty = useRef(initialMessages.length === 0)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const inFlightRef = useRef(false)
  const pinBottomRef = useRef(true)
  const timesRef = useRef<Map<string, Date>>(new Map())
  const { messages, sendMessage, status, error, regenerate, clearError } = useChat({
    messages: initialMessages,
  })
  const busy = locating || status === "submitted" || status === "streaming"

  const stamp = (id: string) => {
    const existing = timesRef.current.get(id)
    if (existing) return existing
    const next = new Date()
    timesRef.current.set(id, next)
    return next
  }

  useEffect(() => {
    saveChatHistory(messages)
  }, [messages])

  useEffect(() => {
    const el = listRef.current
    if (!el || !pinBottomRef.current) return
    el.scrollTo({ top: el.scrollHeight, behavior: status === "streaming" ? "auto" : "smooth" })
  }, [messages, status, blockedCerca, locating])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) return
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (variant !== "widget" || !onClose) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [variant, onClose])

  const submitText = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text || inFlightRef.current) return
      inFlightRef.current = true
      clearError()
      setBlockedCerca(null)
      pinBottomRef.current = true
      let body: { lat: number; lng: number } | undefined
      try {
        if (isCercaMioQuery(text)) {
          setLocating(true)
          try {
            const location = await requestBrowserLocation()
            if (location) body = location
            else {
              setBlockedCerca(text)
              return
            }
          } finally {
            setLocating(false)
          }
        }
        await sendMessage({ text }, body ? { body } : undefined)
      } finally {
        inFlightRef.current = false
      }
    },
    [clearError, sendMessage]
  )

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const value = input
    setInput("")
    void submitText(value)
  }

  const onListScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget
    pinBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 64
  }

  const last = messages[messages.length - 1]
  const waitingFirstToken =
    status === "submitted" ||
    (status === "streaming" && last?.role === "assistant" && !assistantHasBody(last))
  const visible = messages.filter((message) =>
    message.role === "user" ? Boolean(chatMessageText(message)) : assistantHasBody(message)
  )
  const threadClass = cn("mx-auto w-full", variant === "page" ? "max-w-[420px]" : "max-w-full")

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#F7F3EB] font-sans text-[#1F4D35]",
        variant === "widget" && "md:rounded-[20px] md:shadow-[0_8px_28px_-8px_rgba(31,77,53,0.35)]"
      )}
      role={variant === "widget" ? "dialog" : "region"}
      aria-label="CeliBOT"
      aria-modal={variant === "widget" || undefined}
    >
      <header
        className={cn(
          "flex shrink-0 items-start gap-3 px-4 py-4 text-white shadow-[0_2px_8px_rgba(0,0,0,0.1)]",
          "bg-[linear-gradient(180deg,#1F4D35_0%,#2A5E45_100%)]",
          "max-md:pt-[max(1rem,var(--safe-area-top))]",
          variant === "widget" && "md:rounded-t-[20px]"
        )}
      >
        {variant === "page" ? (
          <Link
            href="/"
            className="mt-0.5 flex h-9 shrink-0 items-center gap-1 rounded-full px-1 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label="Volver a CeliMap"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
            <span className="text-[13px] font-semibold">Volver</span>
          </Link>
        ) : null}
        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F7F3EB]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CELIBOT_SRC}
            alt=""
            width={44}
            height={44}
            className="h-10 w-10 object-contain"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold leading-tight text-white">CeliBOT</p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/60">
            Puede cometer errores · Confirmá siempre en el lugar
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors duration-150 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label="Cerrar CeliBOT"
          >
            <X className="h-5 w-5" strokeWidth={2.2} />
          </button>
        ) : null}
      </header>

      <div
        ref={listRef}
        onScroll={onListScroll}
        className="celimap-chat-map min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 md:px-4 md:py-4"
      >
        <div className={threadClass}>
          {startedEmpty.current ? (
            <div className="celimap-chat-welcome-in mb-4">
              <div className="flex items-end gap-2">
                <ChatAvatar />
                <div className={cn(BOT_BUBBLE, "max-w-[85%]")}>
                  ¡Hola! 👋 Puedo ayudarte a encontrar lugares sin TACC y responder dudas sobre
                  celiaquía.
                </div>
              </div>
              <BubbleTime at={stamp("welcome")} side="left" />
              <div
                className={cn(
                  "celimap-chat-chips-row ml-11 mt-2 flex flex-nowrap gap-2 overflow-x-auto pb-1",
                  (messages.length > 0 || blockedCerca) && "celimap-chat-chips-out"
                )}
              >
                {CHIPS.map((chip) => (
                  <button
                    key={chip.send}
                    type="button"
                    disabled={busy}
                    onClick={() => void submitText(chip.send)}
                    className="shrink-0 rounded-[20px] border-[1.5px] border-[#1F4D35] bg-white px-4 py-2 text-left text-[13px] font-semibold text-[#1F4D35] transition-[background-color,color] duration-150 hover:bg-[#1F4D35] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40 disabled:opacity-50"
                  >
                    <span className="mr-1.5" aria-hidden>
                      {chip.icon}
                    </span>
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            {visible.map((message, index) => {
              const text = chatMessageText(message)
              const isUser = message.role === "user"
              const prev = visible[index - 1]
              const next = visible[index + 1]
              const firstInGroup = !prev || prev.role !== message.role
              const lastInGroup = !next || next.role !== message.role
              const spacing = index === 0 ? "" : prev && prev.role === message.role ? "mt-1" : "mt-4"
              const at = stamp(message.id)

              if (isUser) {
                return (
                  <div key={message.id} className={cn("flex flex-col items-end", spacing)}>
                    <div className={cn(USER_BUBBLE, "celimap-chat-bubble-in max-w-[80%]")}>{text}</div>
                    {lastInGroup ? <BubbleTime at={at} side="right" /> : null}
                  </div>
                )
              }

              const places = getChatToolOutput<BuscarLugaresResult>(message, "buscarLugares")
              const lists = getChatToolOutput<BuscarListasResult>(message, "buscarListas")
              const zona = chatZonaFromInput(
                getChatToolInput<BuscarLugaresInput>(message, "buscarLugares")
              )
              const miniPlaces = mergePlaceCards(places, extractChatPlaceLinks(text))
              const visibleText =
                miniPlaces.length > 0 ? stripChatPlaceLinkMarkdown(text) : text

              return (
                <div key={message.id} className={cn("flex items-start gap-2", spacing)}>
                  <span className="flex w-11 shrink-0 justify-center pt-1">
                    {firstInGroup ? <ChatAvatar /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    {visibleText || miniPlaces.length > 0 ? (
                      <div
                        className={cn(BOT_BUBBLE, "celimap-chat-bubble-in inline-block max-w-[85%]")}
                      >
                        {visibleText ? (
                          <ChatMarkdown text={visibleText} onNavigate={onClose} />
                        ) : null}
                        <ChatPlaceMiniCards lugares={miniPlaces} onNavigate={onClose} />
                      </div>
                    ) : null}
                    {lastInGroup ? <BubbleTime at={at} side="left" /> : null}
                    {lists ? <ChatListCards result={lists} onNavigate={onClose} /> : null}
                    {places ? <ChatPlaceCards result={places} zona={zona} /> : null}
                  </div>
                </div>
              )
            })}
          </div>

          {blockedCerca ? (
            <div className="mt-4 space-y-2">
              <div className="flex flex-col items-end">
                <div className={cn(USER_BUBBLE, "celimap-chat-bubble-in max-w-[80%]")}>
                  {blockedCerca}
                </div>
                <BubbleTime at={stamp("blocked-user")} side="right" />
              </div>
              <div className="flex items-start gap-2">
                <ChatAvatar />
                <div className="min-w-0 flex-1">
                  <div className={cn(BOT_BUBBLE, "celimap-chat-bubble-in inline-block max-w-[85%]")}>
                    El teléfono no me pasó la ubicación. Tocá un barrio y te busco cafeterías o
                    lugares ahí.
                  </div>
                  <BubbleTime at={stamp("blocked-bot")} side="left" />
                  <div className="celimap-chat-chips-row mt-2 flex flex-nowrap gap-2 overflow-x-auto pb-1">
                    {BARRIO_CHIPS.map((barrio) => (
                      <button
                        key={barrio}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const follow = cercaFollowUp(blockedCerca, barrio)
                          setBlockedCerca(null)
                          void submitText(follow)
                        }}
                        className="shrink-0 rounded-[20px] border-[1.5px] border-[#1F4D35] bg-white px-4 py-2 text-[13px] font-semibold text-[#1F4D35] transition-[background-color,color] duration-150 hover:bg-[#1F4D35] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40 disabled:opacity-50"
                      >
                        {barrio}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {locating ? (
            <div className="mt-4 flex items-end gap-2" aria-live="polite">
              <ChatAvatar />
              <div className={cn(BOT_BUBBLE, "celimap-chat-bubble-in text-[13px] text-[#333]/70")}>
                Pidiendo ubicación. Si el teléfono la bloquea, te pido un barrio.
              </div>
            </div>
          ) : null}

          {waitingFirstToken ? (
            <div className="mt-4 flex items-end gap-2" aria-live="polite" aria-label="Escribiendo">
              <ChatAvatar />
              <div className={cn(BOT_BUBBLE, "flex items-center gap-1.5 px-4 py-3")}>
                <span className="celimap-chat-dot h-1.5 w-1.5 rounded-full bg-[#1F4D35]/50" />
                <span className="celimap-chat-dot h-1.5 w-1.5 rounded-full bg-[#1F4D35]/50" />
                <span className="celimap-chat-dot h-1.5 w-1.5 rounded-full bg-[#1F4D35]/50" />
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 flex items-end gap-2">
              <ChatAvatar />
              <div className={cn(BOT_BUBBLE, "max-w-[85%]")}>
                <p>{parseChatClientErrorMessage(error)}</p>
                <button
                  type="button"
                  className="mt-2 text-[13px] font-semibold text-[#B64320] hover:underline"
                  onClick={() => {
                    clearError()
                    void regenerate()
                  }}
                >
                  Reintentar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className={cn(
          "shrink-0 bg-[#F7F3EB] px-3 pt-2",
          "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]",
          variant === "page" && "mx-auto w-full max-w-[420px]"
        )}
      >
        <div
          className={cn(
            "relative rounded-[24px] border-[1.5px] border-[#DEDBD5] bg-white py-3.5 pl-5 pr-[52px] transition-[border-color,box-shadow] duration-150",
            "focus-within:border-[#1F4D35] focus-within:shadow-[0_0_0_3px_rgba(31,77,53,0.1)]"
          )}
        >
          <label className="sr-only" htmlFor="celimap-chat-input">
            Mensaje
          </label>
          <textarea
            id="celimap-chat-input"
            ref={inputRef}
            value={input}
            disabled={busy}
            rows={1}
            placeholder="Escribí tu consulta..."
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                const value = input
                setInput("")
                void submitText(value)
              }
            }}
            className="max-h-24 min-h-[22px] w-full resize-none bg-transparent text-[16px] text-[#333] outline-none placeholder:text-[14px] placeholder:text-[#AAA] disabled:opacity-60 md:max-h-32 md:text-[14px]"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Enviar mensaje"
            className="absolute bottom-1.5 right-1.5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#1F4D35] text-white transition-colors duration-150 hover:bg-[#2A5E45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40 disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </div>
      </form>
    </div>
  )
}

export function ChatFab({
  open = false,
  onToggle,
}: {
  open?: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? "Cerrar CeliBOT" : "Abrir CeliBOT"}
      aria-expanded={open}
      className={cn(
        "relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full shadow-[0_4px_14px_rgba(31,77,53,0.28)] transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B64320] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F3EB]",
        open ? "bg-[#1F4D35] text-white" : "bg-[#F7F3EB]"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CELIBOT_SRC}
        alt=""
        width={64}
        height={64}
        className={cn(
          "h-[90%] w-[90%] object-contain transition-transform duration-150 ease-out",
          open ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        )}
      />
      <X
        className={cn(
          "absolute h-6 w-6 transition-transform duration-150 ease-out",
          open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        )}
        strokeWidth={2.2}
      />
    </button>
  )
}
