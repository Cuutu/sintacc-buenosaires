"use client"

import { useChat } from "@ai-sdk/react"
import { MessageCircle, Send, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { ChatMarkdown } from "@/components/chat/ChatMarkdown"
import { chatMessageText, loadChatHistory, saveChatHistory } from "@/components/chat/storage"
import { parseChatClientErrorMessage } from "@/lib/chat/errors"
import { isCercaMioQuery } from "@/lib/chat/normalize-zona"
import { cn } from "@/lib/utils"

const CHIPS = [
  "Lugares 100% sin TACC en Palermo",
  "¿Qué es la contaminación cruzada?",
  "Cafeterías cerca mío",
] as const

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

export function ChatPanel({ variant, onClose }: ChatPanelProps) {
  const [bootMessages, setBootMessages] = useState<ReturnType<typeof loadChatHistory> | null>(null)

  useEffect(() => {
    setBootMessages(loadChatHistory())
  }, [])

  if (bootMessages === null) {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col bg-[#F7F3EB] text-[#1F4D35]",
        )}
        aria-busy="true"
      />
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
  const bottomRef = useRef<HTMLDivElement>(null)
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
    (status === "streaming" && last?.role === "assistant" && !chatMessageText(last))

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden bg-[#F7F3EB] font-sans text-[#1F4D35]",
        variant === "widget" &&
          "md:rounded-[28px] md:border md:border-[#1F4D35]/10 md:shadow-[0_24px_60px_-28px_rgba(31,77,53,0.45)]",
        variant === "page" && "mx-auto max-w-[420px] sm:border-x sm:border-[#1F4D35]/10"
      )}
      role={variant === "widget" ? "dialog" : "region"}
      aria-label="Asistente CeliMap"
      aria-modal={variant === "widget" || undefined}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-[#1F4D35]/10 bg-white/70 px-4 py-3">
        <BrandLogo markOnly size="xs" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-semibold leading-tight">Asistente CeliMap</p>
          <p className="text-[11px] leading-snug text-[#1F4D35]/65">
            Puede cometer errores. Confirmá siempre en el lugar.
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#1F4D35] hover:bg-[#1F4D35]/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40"
            aria-label="Cerrar chat"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {showWelcome ? (
          <div className="space-y-3">
            <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white px-3.5 py-3 text-[14px] leading-relaxed shadow-[0_8px_24px_-18px_rgba(31,77,53,0.35)]">
              Hola. Puedo ayudarte a encontrar lugares sin TACC de CeliMap y a resolver dudas de celiaquía. ¿Qué estás buscando?
            </div>
            <div className="flex flex-col gap-2">
              {CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={busy}
                  onClick={() => void submitText(chip)}
                  className="rounded-full border border-[#1F4D35]/15 bg-white px-3 py-2 text-left text-[13px] font-medium text-[#1F4D35] hover:border-[#B64320]/40 hover:text-[#B64320] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40 disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {messages.map((message) => {
            const text = chatMessageText(message)
            if (!text) return null
            const isUser = message.role === "user"
            return (
              <div key={message.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] px-3.5 py-2.5 text-[14px] leading-relaxed",
                    isUser
                      ? "rounded-2xl rounded-tr-md bg-[#1F4D35] text-white"
                      : "rounded-2xl rounded-tl-md bg-white text-[#1F4D35] shadow-[0_8px_24px_-18px_rgba(31,77,53,0.35)]"
                  )}
                >
                  {isUser ? text : <ChatMarkdown text={text} />}
                </div>
              </div>
            )
          })}
        </div>

        {locating ? (
          <div className="mt-3 flex justify-start" aria-live="polite">
            <div className="rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-[13px] text-[#1F4D35]/70">
              Pidiendo ubicación…
            </div>
          </div>
        ) : null}

        {waitingFirstToken ? (
          <div className="mt-3 flex justify-start" aria-live="polite" aria-label="Escribiendo">
            <div className="flex gap-1 rounded-2xl rounded-tl-md bg-white px-3 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1F4D35]/50 [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1F4D35]/50 [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1F4D35]/50" />
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-3 rounded-2xl border border-[#B64320]/25 bg-white px-3.5 py-3 text-[13px] text-[#1F4D35]">
            <p>{parseChatClientErrorMessage(error)}</p>
            <button
              type="button"
              className="mt-2 text-[13px] font-semibold text-[#B64320] underline-offset-2 hover:underline"
              onClick={() => {
                clearError()
                void regenerate()
              }}
            >
              Reintentar
            </button>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="shrink-0 border-t border-[#1F4D35]/10 bg-white/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-[#1F4D35]/15 bg-[#F7F3EB] px-2 py-1.5 focus-within:border-[#1F4D35]/40">
          <label className="sr-only" htmlFor="celimap-chat-input">
            Mensaje
          </label>
          <textarea
            id="celimap-chat-input"
            ref={inputRef}
            value={input}
            disabled={busy}
            rows={1}
            placeholder="Escribí tu consulta"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                const value = input
                setInput("")
                void submitText(value)
              }
            }}
            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[14px] text-[#1F4D35] outline-none placeholder:text-[#1F4D35]/45 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Enviar mensaje"
            className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-[#1F4D35] text-white hover:bg-[#183d2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D35]/40 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  )
}

export function ChatFab({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Abrir asistente CeliMap"
      className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1F4D35] text-white shadow-[0_12px_28px_-10px_rgba(31,77,53,0.7)] transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B64320] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F3EB]"
    >
      <MessageCircle className="h-6 w-6" strokeWidth={2.2} />
    </button>
  )
}
