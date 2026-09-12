"use client"

import { ChatPanel } from "@/components/chat/ChatPanel"
import { useVisualViewportBox } from "@/components/chat/use-visual-viewport-box"
import "@/components/chat/chat-ui.css"

export default function ChatTestPage() {
  const box = useVisualViewportBox(true)
  return (
    <div className="celimap-chat-mobile-shell fixed inset-0 z-[90] md:h-auto md:max-h-none md:bg-[#F7F3EB]">
      <div
        className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#F7F3EB]"
        style={
          box
            ? {
                height: box.height,
                maxHeight: box.height,
                marginTop: box.top,
              }
            : undefined
        }
      >
        <ChatPanel variant="page" keyboardOpen={Boolean(box?.keyboard)} />
      </div>
    </div>
  )
}
