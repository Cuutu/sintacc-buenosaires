"use client"

import { useEffect, useState } from "react"
import { ChatFab, ChatPanel } from "@/components/chat/ChatPanel"
import { cn } from "@/lib/utils"
import "@/components/chat/chat-ui.css"

export function ChatWidget() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      {open ? (
        <div
          className={cn(
            "celimap-chat-panel-enter fixed z-[70]",
            "inset-0",
            "md:inset-auto md:bottom-[5.5rem] md:right-6 md:h-[600px] md:w-[380px]"
          )}
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
