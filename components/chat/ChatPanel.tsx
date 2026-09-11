"use client"

import { ArrowLeft, ArrowUp, X } from "lucide-react"
import { useChat } from "@ai-sdk/react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { ChatListCards, ChatPlaceCards, chatZonaFromInput } from "@/components/chat/ChatCards"
import { ChatMarkdown } from "@/components/chat/ChatMarkdown"
import { chatMessageText, loadChatHistory, saveChatHistory } from "@/components/chat/storage"
import type { BuscarListasResult } from "@/lib/chat/buscar-listas"
import type { BuscarLugaresInput, BuscarLugaresResult } from "@/lib/chat/buscar-lugares"
import { parseChatClientErrorMessage } from "@/lib/chat/errors"
import { isCercaMioQuery } from "@/lib/chat/normalize-zona"
import { getChatToolInput, getChatToolOutput } from "@/lib/chat/ui-parts"
import { cn } from "@/lib/utils"
import type { UIMessage } from "ai"
import "@/components/chat/chat-ui.css"

const CHIPS = [
  "Lugares 100% sin TACC en Palermo",
  "¿Qué es la contaminación cruzada?",
  "Cafeterías cerca mío",
] as const

const BARRIO_CHIPS = ["Palermo", "Belgrano", "Recoleta", "San Telmo", "Caballito"] as const


const BOT_BUBBLE =
  "rounded-[16px] rounded-tl-[4px] border border-[#E0D9CF] bg-white px-[18px] py-[14px] text-[14px] leading-relaxed text-[#2D2D2D] shadow-[0_1px_3px_rgba(0,0,0,0.06)]"

const USER_BUBBLE =
  "rounded-[16px] rounded-br-[4px] bg-[#1F4D35] px-[18px] py-[14px] text-[14px] leading-relaxed text-white"

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
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 }
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

function ChatAvatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/mark.png?v2"
        alt=""
        width={24}
        height={32}
        className="h-6 w-auto"
      />
    </span>
  )
}

export function ChatPanel({ variant, onClose }: ChatPanelProps) {
  const [bootMessages, setBootMessages] = useState<ReturnType<typeof loadChatHistory> | null>(null)

  useEffect(() => {
    setBootMessages(loadChatHistory())
  }, [])

  if (bootMessages === null) {
    return (
      <div className="flex h-full w-full flex-col bg-[#F7F3EB]" aria-busy="true" />
    )
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
  const [introGone, setIntroGone] = useState(initialMessages.length > 0)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const inFlightRef = useRef(false)
  const { messages, sendMessage, status, error, regenerate, clearError } = useChat({
    messages: initialMessages,
  })
  const busy = locating || status === "submitted" || status === "streaming"

  useEffect(() => {
    saveChatHistory(messages)
  }, [messages])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, status, blockedCerca])

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

  useEffect(() => {
    if (messages.length === 0 && !blockedCerca) {
      setIntroGone(false)
      return
    }
    if (introGone) return
    const id = window.setTimeout(() => setIntroGone(true), 160)
    return () => window.clearTimeout(id)
  }, [messages.length, introGone, blockedCerca])

  const submitText = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text || inFlightRef.current) return
      inFlightRef.current = true
      clearError()
      setBlockedCerca(null)
      let body: { lat: number; lng: number } | undefined
      try {
        if (isCercaMioQuery(text)) {
          setLocating(true)
          try {
            const location = await requestBrowserLocation()
            if (location) body = location
            else {
              setBlockedCerca(text)
              setIntroGone(true)
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

  const showWelcome = messages.length === 0 && !blockedCerca
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
        variant === "widget" && "md:rounded-2xl md:shadow-[0_8px_28px_-8px_rgba(31,77,53,0.35)]"
      )}
      role={variant === "widget" ? "dialog" : "region"}
      aria-label="CeliBot"
      aria-modal={variant === "widget" || undefined}
    >
      <header
        className={cn(
          "flex shrink-0 items-center gap-2 bg-[#1F4D35] px-3 py-2 text-white sm:px-4 md:py-3",
          variant === "widget" && "md:rounded-t-2xl"
        )}
      >
        {variant === "page" ? (
          <Link
            href="/"
            className="flex h-10 shrink-0 items-center gap-1 rounded-full px-2 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 md:h-11"
            aria-label="Volver a CeliMap"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
            <span className="text-[13px] font-semibold">Volver</span>
          </Link>
        ) : null}
        <BrandLogo
          inverse
          size="xs"
          className="min-w-0 shrink [&_img]:h-7 [&_img]:max-w-[8.75rem] md:[&_img]:h-8 md:[&_img]:max-w-[11rem]"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-[15px] font-bold leading-tight md:text-[16px]">
            CeliBot
          </p>
          <p className="hidden truncate text-[11px] leading-snug text-white/70 sm:block">
            Confirmá siempre en el lugar.
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 md:h-11 md:w-11"
            aria-label="Cerrar CeliBot"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </header>

      <div
        ref={listRef}
        className="celimap-chat-map min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 md:px-4 md:py-4"
      >
        <div className={threadClass}>
        {introGone ? null : (
          <div className={cn("mb-4", messages.length > 0 && "celimap-chat-chips-out")}>
            <div className="flex items-end gap-2">
              <ChatAvatar />
              <div className={cn(BOT_BUBBLE, "celimap-chat-bubble-in max-w-[85%]")}>
                Hola, soy CeliBot. Te ayudo a encontrar lugares sin TACC de CeliMap y a resolver
                dudas de celiaquía. ¿Qué estás buscando?
              </div>
            </div>
            {showWelcome && !blockedCerca ? (
              <div className="ml-10 mt-2 flex flex-wrap gap-2">
                {CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={busy}
                    onClick={() => void submitText(chip)}
                    className="rounded-[20px] border-[1.5px] border-[#1F4D35] bg-white px-3 py-2 text-left text-[13px] font-semibold text-[#1F4D35] transition-[background-color,color] duration-150 hover:bg-[#1F4D35] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40 disabled:opacity-50 md:px-4 md:py-2.5 md:text-[14px]"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}

        <div>
          {visible.map((message, index) => {
            const text = chatMessageText(message)
            const isUser = message.role === "user"
            const prev = visible[index - 1]
            const firstInGroup = !prev || prev.role !== message.role
            const spacing = index === 0 ? "" : prev && prev.role === message.role ? "mt-1" : "mt-4"

            if (isUser) {
              return (
                <div key={message.id} className={cn("flex justify-end", spacing)}>
                  <div className={cn(USER_BUBBLE, "max-w-[80%]")}>{text}</div>
                </div>
              )
            }

            const places = getChatToolOutput<BuscarLugaresResult>(message, "buscarLugares")
            const lists = getChatToolOutput<BuscarListasResult>(message, "buscarListas")
            const zona = chatZonaFromInput(
              getChatToolInput<BuscarLugaresInput>(message, "buscarLugares")
            )

            return (
              <div key={message.id} className={cn("flex items-start gap-2", spacing)}>
                <span className="flex w-8 shrink-0 justify-center pt-1">
                  {firstInGroup ? <ChatAvatar /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  {text ? (
                    <div className={cn(BOT_BUBBLE, "celimap-chat-bubble-in inline-block max-w-[95%]")}>
                      <ChatMarkdown text={text} />
                    </div>
                  ) : null}
                  {lists ? <ChatListCards result={lists} /> : null}
                  {places ? <ChatPlaceCards result={places} zona={zona} /> : null}
                </div>
              </div>
            )
          })}
        </div>

        {blockedCerca ? (
          <div className="mt-4 space-y-2">
            <div className="flex justify-end">
              <div className={cn(USER_BUBBLE, "max-w-[80%]")}>{blockedCerca}</div>
            </div>
            <div className="flex items-start gap-2">
              <ChatAvatar />
              <div className="min-w-0 flex-1">
                <div className={cn(BOT_BUBBLE, "celimap-chat-bubble-in inline-block max-w-[95%]")}>
                  No pude usar tu ubicación. Tocá un barrio y te busco ahí.
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
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
                      className="rounded-[20px] border-[1.5px] border-[#1F4D35] bg-white px-3 py-2 text-[13px] font-semibold text-[#1F4D35] hover:bg-[#1F4D35] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40 disabled:opacity-50"
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
            <div className={cn(BOT_BUBBLE, "celimap-chat-bubble-in text-[13px] text-[#2D2D2D]/70")}>
              Pidiendo ubicación. Si no se puede, te pido un barrio.
            </div>
          </div>
        ) : null}

        {waitingFirstToken ? (
          <div className="mt-4 flex items-end gap-2" aria-live="polite" aria-label="Escribiendo">
            <ChatAvatar />
            <div className={cn(BOT_BUBBLE, "flex items-center gap-1.5 px-4 py-3")}>
              <span className="celimap-chat-dot h-1.5 w-1.5 rounded-full bg-[#1F4D35]/55" />
              <span className="celimap-chat-dot h-1.5 w-1.5 rounded-full bg-[#1F4D35]/55" />
              <span className="celimap-chat-dot h-1.5 w-1.5 rounded-full bg-[#1F4D35]/55" />
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
          "shrink-0 bg-[#F7F3EB] px-3 pb-3 pt-2",
          variant === "page" && "mx-auto w-full max-w-[420px]"
        )}
      >
        <div
          className={cn(
            "relative rounded-[24px] border-[1.5px] border-[#E0D9CF] bg-white py-3 pl-5 pr-12 transition-[border-color,box-shadow] duration-150",
            "focus-within:border-[#1F4D35] focus-within:shadow-[0_1px_8px_rgba(31,77,53,0.12)]"
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
            className="max-h-24 min-h-[24px] w-full resize-none bg-transparent text-[16px] text-[#2D2D2D] outline-none placeholder:text-[#999] disabled:opacity-60 md:max-h-32 md:text-[14px]"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Enviar mensaje"
            className="absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#1F4D35] text-white hover:bg-[#183d2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40 disabled:opacity-40"
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
      aria-label={open ? "Cerrar CeliBot" : "Abrir CeliBot"}
      aria-expanded={open}
      className={cn(
        "relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full shadow-[0_4px_14px_rgba(31,77,53,0.28)] transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B64320] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F3EB]",
        open ? "bg-[#1F4D35] text-white" : "bg-[#F7F3EB] ring-2 ring-[#1F4D35]"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/mark.png?v2"
        alt=""
        width={36}
        height={48}
        className={cn(
          "h-9 w-auto transition-transform duration-150 ease-out",
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
