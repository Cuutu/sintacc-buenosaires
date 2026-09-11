"use client"

import { ChatPanel } from "@/components/chat/ChatPanel"
import { useVisualViewportBox } from "@/components/chat/use-visual-viewport-box"
import "@/components/chat/chat-ui.css"

export default function ChatTestPage() {
  const box = useVisualViewportBox(true)
  return (
    <div
      className="celimap-chat-mobile-shell fixed z-[90] md:inset-0 md:h-auto md:max-h-none md:bg-[#F7F3EB]"
      style={
        box
          ? {
              top: box.top,
              height: box.height,
              maxHeight: box.height,
              paddingBottom: box.keyboard ? 8 : undefined,
            }
          : undefined
      }
    >
      <ChatPanel variant="page" />
    </div>
  )
}
