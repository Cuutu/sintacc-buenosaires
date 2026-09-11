"use client"

import { ChatPanel } from "@/components/chat/ChatPanel"

export default function ChatTestPage() {
  return (
    <div className="fixed inset-0 bg-[#F7F3EB]">
      <ChatPanel variant="page" />
    </div>
  )
}
