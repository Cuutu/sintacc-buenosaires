"use client"

import { useEffect, useState } from "react"
import { ChatFab, ChatPanel } from "@/components/chat/ChatPanel"
import { cn } from "@/lib/utils"

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

  if (!open) {
    return (
      <div className="fixed bottom-[calc(var(--bottom-nav-clearance,1rem)+0.75rem)] right-4 z-[60] md:bottom-6 md:right-6">
        <ChatFab onOpen={() => setOpen(true)} />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[70]",
        "md:inset-auto md:bottom-6 md:right-6 md:h-[600px] md:w-[380px]"
      )}
    >
      <ChatPanel variant="widget" onClose={() => setOpen(false)} />
    </div>
  )
}
