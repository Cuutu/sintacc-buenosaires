"use client"

import { X } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ChatFab, ChatPanel } from "@/components/chat/ChatPanel"
import { useVisualViewportBox } from "@/components/chat/use-visual-viewport-box"
import { cn } from "@/lib/utils"
import "@/components/chat/chat-ui.css"

const CLOSE_MS = 300
const HINT_DELAY_MS = 3000
const HINT_LEAVE_MS = 300
const HINT_KEY = "celimap-celibot-hint"
const HINT_TEXT = "¡Hola! Soy CeliBot 👋 Estoy acá para ayudarte a encontrar lugares sin TACC"

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
  const pathname = usePathname() || "/"
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [hintDismissed, setHintDismissed] = useState(false)
  const [hintReady, setHintReady] = useState(false)
  const [fabEnter, setFabEnter] = useState(true)
  const leaveTimer = useRef<number>(0)
  const hintLeaveTimer = useRef<number>(0)
  const hintRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const mobileBox = useVisualViewportBox(open || leaving)
  const home = pathname === "/"
  const hintSide: "left" | "top" = home ? "left" : "top"
  const showHint = hintReady && !hintDismissed && !open
  const pulse = !open && !hintDismissed

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
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    window.scrollTo(0, 0)
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
    }
  }, [open])

  const dismissHint = () => {
    if (hintDismissed || hintLeaving) return
    persistHintDismissed()
    setHintLeaving(true)
    window.clearTimeout(hintLeaveTimer.current)
    hintLeaveTimer.current = window.setTimeout(() => {
      setHintDismissed(true)
      setHintLeaving(false)
      setHintReady(false)
    }, HINT_LEAVE_MS)
  }

  const show = () => {
    persistHintDismissed()
    setHintDismissed(true)
    setHintReady(false)
    setHintLeaving(false)
    setFabEnter(false)
    window.clearTimeout(leaveTimer.current)
    setLeaving(false)
    setMounted(true)
    setOpen(true)
  }

  const hide = () => {
    setOpen(false)
    setLeaving(true)
    window.clearTimeout(leaveTimer.current)
    leaveTimer.current = window.setTimeout(() => {
      setMounted(false)
      setLeaving(false)
    }, CLOSE_MS)
  }

  useEffect(() => {
    if (!showHint && !hintLeaving) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null
      if (hintRef.current?.contains(target)) return
      if (dockRef.current?.contains(target)) return
      dismissHint()
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [showHint, hintLeaving, hintDismissed])

  return (
    <>
      {mounted ? (
        <div
          className={cn(
            "celimap-chat-mobile-shell fixed z-[200] overflow-hidden bg-[#F7F3EB]",
            leaving ? "celimap-chat-panel-leave" : "celimap-chat-panel-enter",
            "md:bottom-[5.5rem] md:right-6 md:top-auto md:h-[600px] md:w-[380px] md:max-h-[min(600px,calc(100dvh-6rem))] md:bg-[#F7F3EB] md:p-0"
          )}
          style={
            mobileBox
              ? {
                  top: mobileBox.top,
                  height: mobileBox.height,
                  maxHeight: mobileBox.height,
                  paddingBottom: mobileBox.keyboard ? 8 : undefined,
                }
              : undefined
          }
        >
          <ChatPanel variant="widget" onClose={hide} />
        </div>
      ) : null}
      <div
        ref={dockRef}
        className={cn(
          "fixed bottom-6 right-6 z-[90]",
          "max-md:bottom-[calc(var(--bottom-nav-clearance,1.5rem)+1.75rem)]",
          open && "max-md:hidden"
        )}
      >
        {showHint || hintLeaving ? (
          <div
            ref={hintRef}
            data-side={hintSide}
            role="dialog"
            aria-label="CeliBOT"
            className={cn(
              "celimap-fab-hint absolute z-[2] w-[240px] max-w-[min(240px,calc(100vw-6.5rem))] rounded-[12px] bg-white px-4 py-3 pr-8 text-left shadow-[0_4px_16px_rgba(0,0,0,0.12)]",
              hintLeaving && "celimap-fab-hint-leave",
              hintSide === "left"
                ? "bottom-1 right-[calc(100%+12px)]"
                : "bottom-[calc(100%+12px)] right-0",
              "md:bottom-1 md:right-[calc(100%+12px)] md:left-auto"
            )}
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
              onClick={show}
              className="block w-full text-left text-[13px] leading-[1.4] text-[#333]"
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
            <ChatFab open={open} onToggle={() => (open ? hide() : show())} />
          </div>
        </div>
      </div>
    </>
  )
}
