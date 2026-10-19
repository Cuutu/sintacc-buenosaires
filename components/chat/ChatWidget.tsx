"use client"

import { X } from "lucide-react"
import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { ChatFab } from "@/components/chat/ChatFab"
import {
  useMobileBodyLock,
  useVisualViewportBox,
} from "@/components/chat/use-visual-viewport-box"
import { cn } from "@/lib/utils"
import {
  OPEN_CELIBOT_EVENT,
  setCeliBotPreloader,
  setCeliBotWidgetReady,
  type OpenCeliBotDetail,
} from "@/lib/celibot-open"
import "@/components/chat/chat-ui.css"

/**
 * El panel (AI SDK, markdown, tarjetas de lugares) se baja recién al abrir CeliBot,
 * o un toque antes si el puntero pasa por el botón o por el saludo.
 */
const loadChatPanel = () => import("@/components/chat/ChatPanel")

const ChatPanel = dynamic(() => loadChatPanel().then((mod) => mod.ChatPanel), {
  ssr: false,
  loading: () => <div className="flex h-full w-full flex-col bg-[#F7F3EB]" aria-busy="true" />,
})

let chatPanelPreload: Promise<unknown> | null = null

function preloadChatPanel() {
  // Si falla (sin conexión), se vuelve a intentar al abrir.
  chatPanelPreload ??= loadChatPanel().catch(() => {
    chatPanelPreload = null
  })
}

const CLOSE_MS = 300
const HINT_DELAY_MS = 1400
const HINT_LEAVE_MS = 300
const HINT_KEY = "celimap-celibot-hello"
const HINT_TEXT = "Hola, soy CeliBot"
/** En inicio y mapa el globo tapaba contenido ("Ver todos", hoja de lugares): ahí sólo queda el botón. */
const HINT_HIDDEN_PATHS = new Set(["/", "/mapa"])
/**
 * En mobile, inicio y mapa no llevan el botón flotante: CeliBot se abre desde el buscador
 * (inicio) y desde la barra de búsqueda del mapa. Flotando siempre tapaba algo.
 */
const FAB_HIDDEN_MOBILE_PATHS = new Set(["/", "/mapa"])

function readHintDismissed(): boolean {
  try {
    return sessionStorage.getItem(HINT_KEY) === "1"
  } catch {
    return false
  }
}

function persistHintDismissed() {
  try {
    sessionStorage.setItem(HINT_KEY, "1")
  } catch {
    /* private mode */
  }
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [hintDismissed, setHintDismissed] = useState(false)
  const [hintReady, setHintReady] = useState(false)
  const [hintLeaving, setHintLeaving] = useState(false)
  const [fabEnter, setFabEnter] = useState(true)
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined)
  const leaveTimer = useRef<number>(0)
  const hintLeaveTimer = useRef<number>(0)
  const hintRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const mobileBox = useVisualViewportBox(mounted)
  const [hintIdle, setHintIdle] = useState(false)
  const pathname = usePathname() || "/"
  const showHint = hintReady && !hintDismissed && !open && !HINT_HIDDEN_PATHS.has(pathname)
  const pulse = !open && !hintDismissed
  useMobileBodyLock(mounted)

  useEffect(() => {
    return () => {
      window.clearTimeout(leaveTimer.current)
      window.clearTimeout(hintLeaveTimer.current)
    }
  }, [])

  useEffect(() => {
    if (readHintDismissed()) {
      setHintDismissed(true)
      return
    }
    const timer = window.setTimeout(() => setHintReady(true), HINT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!open) return
    if (!window.matchMedia("(min-width: 768px)").matches) return
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
    }
  }, [open])

  const dismissHint = () => {
    if (hintDismissed || hintLeaving) return
    persistHintDismissed()
    setHintIdle(false)
    setHintLeaving(true)
    window.clearTimeout(hintLeaveTimer.current)
    hintLeaveTimer.current = window.setTimeout(() => {
      setHintDismissed(true)
      setHintLeaving(false)
      setHintReady(false)
    }, HINT_LEAVE_MS)
  }

  const show = (prompt?: string) => {
    setInitialPrompt(prompt)
    persistHintDismissed()
    setHintDismissed(true)
    setHintReady(false)
    setHintLeaving(false)
    setHintIdle(false)
    setFabEnter(false)
    window.clearTimeout(leaveTimer.current)
    setLeaving(false)
    setMounted(true)
    setOpen(true)
  }

  const showRef = useRef(show)
  showRef.current = show

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<OpenCeliBotDetail>).detail
      showRef.current(detail?.prompt)
    }
    window.addEventListener(OPEN_CELIBOT_EVENT, onOpen)
    setCeliBotPreloader(preloadChatPanel)
    const pendingOpen = setCeliBotWidgetReady(true)
    if (pendingOpen) showRef.current(pendingOpen.prompt)
    return () => {
      setCeliBotWidgetReady(false)
      setCeliBotPreloader(null)
      window.removeEventListener(OPEN_CELIBOT_EVENT, onOpen)
    }
  }, [])

  const hide = () => {
    setOpen(false)
    setLeaving(true)
    window.clearTimeout(leaveTimer.current)
    leaveTimer.current = window.setTimeout(() => {
      setMounted(false)
      setLeaving(false)
    }, CLOSE_MS)
  }

  return (
    <>
      {mounted ? (
        <div
          className={cn(
            "celimap-chat-mobile-shell fixed z-[200] overflow-hidden bg-[#F7F3EB]",
            "max-md:inset-0 max-md:z-[9999]",
            leaving ? "celimap-chat-panel-leave" : "celimap-chat-panel-enter",
            "md:bottom-[5.5rem] md:left-auto md:right-6 md:top-auto md:h-[600px] md:w-[380px] md:max-h-[min(600px,calc(100dvh-6rem))] md:bg-[#F7F3EB] md:p-0"
          )}
        >
          <div
            className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#F7F3EB]"
            style={
              mobileBox
                ? {
                    height: mobileBox.height,
                    maxHeight: mobileBox.height,
                    marginTop: mobileBox.top,
                  }
                : undefined
            }
          >
            <ChatPanel
              variant="widget"
              onClose={hide}
              keyboardOpen={Boolean(mobileBox?.keyboard)}
              initialPrompt={initialPrompt}
            />
          </div>
        </div>
      ) : null}
      <div
        ref={dockRef}
        className={cn(
          "celimap-chat-dock fixed bottom-6 right-6 z-[90]",
          "max-md:bottom-[calc(var(--bottom-nav-clearance,1.5rem)+0.75rem)] max-md:right-4",
          open && "max-md:hidden",
          FAB_HIDDEN_MOBILE_PATHS.has(pathname) && "max-md:hidden"
        )}
      >
        {showHint || hintLeaving ? (
          <div
            ref={hintRef}
            role="status"
            aria-label="CeliBOT"
            className={cn(
              "celimap-fab-hint absolute bottom-[calc(100%+10px)] right-0 z-[2] w-max max-w-[min(220px,calc(100vw-5rem))] rounded-[16px] bg-white px-3.5 py-2 pr-7 text-left shadow-[0_4px_16px_rgba(0,0,0,0.12)]",
              hintLeaving && "celimap-fab-hint-leave",
              hintIdle && !hintLeaving && "celimap-fab-hint-idle"
            )}
            onAnimationEnd={(event) => {
              if (event.animationName === "celimap-fab-hint-in") setHintIdle(true)
            }}
          >
            <span className="celimap-fab-hint-nub" aria-hidden />
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                dismissHint()
              }}
              aria-label="Cerrar saludo"
              className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center text-[#AAA] transition-colors hover:text-[#333]"
            >
              <X className="h-4 w-4" strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={() => show()}
              onPointerEnter={preloadChatPanel}
              onPointerDown={preloadChatPanel}
              onFocus={preloadChatPanel}
              className="block w-full whitespace-nowrap text-left text-[13px] font-medium leading-[1.35] text-[#333]"
            >
              {HINT_TEXT}
            </button>
          </div>
        ) : null}
        <div
          className={cn("relative h-16 w-16", fabEnter && !open && "celimap-fab-enter")}
          onAnimationEnd={(event) => {
            if (event.animationName === "celimap-fab-bounce") setFabEnter(false)
          }}
        >
          {pulse ? <span className="celimap-fab-ping" aria-hidden /> : null}
          <div className="relative z-[1]">
            <ChatFab
              open={open}
              onToggle={() => (open ? hide() : show())}
              onIntent={preloadChatPanel}
            />
          </div>
        </div>
      </div>
    </>
  )
}
