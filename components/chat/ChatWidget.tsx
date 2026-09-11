"use client"

import { useEffect, useState } from "react"
import { ChatFab, ChatPanel } from "@/components/chat/ChatPanel"
import { useVisualViewportBox } from "@/components/chat/use-visual-viewport-box"
import { cn } from "@/lib/utils"
import "@/components/chat/chat-ui.css"

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const mobileBox = useVisualViewportBox(open)

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

  return (
    <>
      {open ? (
        <div
          className={cn(
            "celimap-chat-panel-enter celimap-chat-mobile-shell fixed z-[90] overflow-hidden",
            "md:bottom-[5.5rem] md:right-6 md:top-auto md:z-[70] md:h-[600px] md:w-[380px] md:max-h-[min(600px,calc(100dvh-6rem))] md:bg-transparent md:p-0"
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
          <ChatPanel variant="widget" onClose={() => setOpen(false)} />
        </div>
      ) : null}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-[80]",
          "max-md:bottom-[max(1.5rem,var(--bottom-nav-clearance,1.5rem))]",
          open && "max-md:hidden"
        )}
      >
        <ChatFab open={open} onToggle={() => setOpen((value) => !value)} />
      </div>
    </>
  )
}
