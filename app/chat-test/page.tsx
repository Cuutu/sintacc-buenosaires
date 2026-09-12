"use client"

import { ChatPanel } from "@/components/chat/ChatPanel"
import { useVisualViewportBox } from "@/components/chat/use-visual-viewport-box"
import "@/components/chat/chat-ui.css"

export default function ChatTestPage() {
  const box = useVisualViewportBox(true)
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[89] h-[200vh] bg-[#F7F3EB] md:hidden"
      />
      <div
        className="celimap-chat-mobile-shell fixed inset-x-0 z-[90] md:inset-0 md:h-auto md:max-h-none md:bg-[#F7F3EB]"
        style={
          box
            ? {
                top: box.top,
                left: 0,
                right: 0,
                height: box.height,
                maxHeight: box.height,
                paddingBottom: box.keyboard ? 8 : undefined,
              }
            : undefined
        }
      >
        <ChatPanel variant="page" keyboardOpen={Boolean(box?.keyboard)} />
      </div>
    </>
  )
}
