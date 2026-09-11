"use client"

import { useEffect, useRef, useState } from "react"
import { ChatFab, ChatPanel } from "@/components/chat/ChatPanel"
import { useVisualViewportBox } from "@/components/chat/use-visual-viewport-box"
import { cn } from "@/lib/utils"
import "@/components/chat/chat-ui.css"

const CLOSE_MS = 300

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const leaveTimer = useRef<number>(0)
  const mobileBox = useVisualViewportBox(open || leaving)

  useEffect(() => {
    return () => window.clearTimeout(leaveTimer.current)
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

  const show = () => {
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
        className={cn(
          "fixed bottom-6 right-6 z-[80]",
          "max-md:bottom-[calc(var(--bottom-nav-clearance,1.5rem)+1.75rem)]",
          open && "max-md:hidden"
        )}
      >
        <ChatFab open={open} onToggle={() => (open ? hide() : show())} />
      </div>
    </>
  )
}
