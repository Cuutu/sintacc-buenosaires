"use client"

import { ArrowUp, MessageCircle, X } from "lucide-react"
import { useChat } from "@ai-sdk/react"
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
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
  if (chatMessageText(message)) return true
  const places = getChatToolOutput<BuscarLugaresResult>(message, "buscarLugares")
  const lists = getChatToolOutput<BuscarListasResult>(message, "buscarListas")
  return Boolean(
    (places && (places.lugares.length > 0 || places.error)) ||
      (lists && (lists.listas.length > 0 || lists.error))
  )
}

function ChatAvatar() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1F4D35]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/mark.png?v2"
        alt=""
        width={20}
        height={27}
        className="h-4 w-auto brightness-0 invert"
      />
    </span>
  )
}

function useKeyboardInset() {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const update = () => {
      const next = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      setInset(next)
    }

    update()
    viewport.addEventListener("resize", update)
    viewport.addEventListener("scroll", update)
    return () => {
      viewport.removeEventListener("resize", update)
      viewport.removeEventListener("scroll", update)
    }
  }, [])

  return inset
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
  const [introGone, setIntroGone] = useState(initialMessages.length > 0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const inFlightRef = useRef(false)
  const keyboardInset = useKeyboardInset()
  const { messages, sendMessage, status, error, regenerate, clearError } = useChat({
    messages: initialMessages,
  })
  const busy = locating || status === "submitted" || status === "streaming"

  useEffect(() => {
    saveChatHistory(messages)
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, status])

  useEffect(() => {
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
    if (messages.length === 0) {
      setIntroGone(false)
      return
    }
    if (introGone) return
    const id = window.setTimeout(() => setIntroGone(true), 160)
    return () => window.clearTimeout(id)
  }, [messages.length, introGone])

  const submitText = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text || inFlightRef.current) return
      inFlightRef.current = true
      clearError()
      let body: { lat: number; lng: number } | undefined
      try {
        if (isCercaMioQuery(text)) {
          setLocating(true)
          try {
            const location = await requestBrowserLocation()
            if (location) body = location
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

  const showWelcome = messages.length === 0
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
        "flex h-full w-full flex-col overflow-hidden bg-[#F7F3EB] font-sans text-[#1F4D35]",
        variant === "widget" && "md:rounded-2xl md:shadow-[0_8px_28px_-8px_rgba(31,77,53,0.35)]"
      )}
      role={variant === "widget" ? "dialog" : "region"}
      aria-label="Asistente CeliMap"
      aria-modal={variant === "widget" || undefined}
      style={{ paddingBottom: keyboardInset }}
    >
      <header
        className={cn(
          "flex shrink-0 items-center gap-3 bg-[#1F4D35] px-4 py-4 text-white",
          variant === "widget" && "md:rounded-t-2xl"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/mark.png?v2"
          alt="CeliMap"
          width={28}
          height={37}
          className="h-8 w-auto shrink-0 brightness-0 invert"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[16px] font-bold leading-tight">Asistente CeliMap</p>
          <p className="text-[11px] leading-snug text-white/70">
            Puede cometer errores. Confirmá siempre en el lugar.
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 md:hidden"
            aria-label="Cerrar chat"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </header>

      <div className="celimap-chat-map min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className={threadClass}>
        {introGone ? null : (
          <div className={cn("mb-4", messages.length > 0 && "celimap-chat-chips-out")}>
            <div className="flex items-end gap-2">
              <ChatAvatar />
              <div className={cn(BOT_BUBBLE, "celimap-chat-bubble-in max-w-[85%]")}>
                Hola. Puedo ayudarte a encontrar lugares sin TACC de CeliMap y a resolver dudas de
                celiaquía. ¿Qué estás buscando?
              </div>
            </div>
            {showWelcome ? (
              <div className="ml-9 mt-2 flex flex-wrap gap-2">
                {CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={busy}
                    onClick={() => void submitText(chip)}
                    className="rounded-[20px] border-[1.5px] border-[#1F4D35] bg-white px-4 py-2.5 text-left text-[14px] font-semibold text-[#1F4D35] transition-[background-color,color] duration-150 hover:bg-[#1F4D35] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40 disabled:opacity-50"
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
                <span className="flex w-7 shrink-0 justify-center pt-1">
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

        {locating ? (
          <div className="mt-4 flex items-end gap-2" aria-live="polite">
            <ChatAvatar />
            <div className={cn(BOT_BUBBLE, "celimap-chat-bubble-in text-[13px] text-[#2D2D2D]/70")}>
              Pidiendo ubicación…
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

        <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className={cn(
          "shrink-0 bg-[#F7F3EB] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2",
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
            className="max-h-32 min-h-[24px] w-full resize-none bg-transparent text-[14px] text-[#2D2D2D] outline-none placeholder:text-[#999] disabled:opacity-60"
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
      aria-label={open ? "Cerrar asistente CeliMap" : "Abrir asistente CeliMap"}
      aria-expanded={open}
      className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#1F4D35] text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B64320] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F3EB]"
    >
      <MessageCircle
        className={cn(
          "h-6 w-6 transition-transform duration-150 ease-out",
          open ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        )}
        strokeWidth={2.2}
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
