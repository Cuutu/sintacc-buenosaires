"use client"

import { Component, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"

const ChatWidget = dynamic(
  () => import("@/components/chat/ChatWidget").then((mod) => mod.ChatWidget),
  { ssr: false }
)

class ChatWidgetGuard extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  render() {
    if (this.state.crashed) return null
    return this.props.children
  }
}

export function ChatWidgetHost() {
  const pathname = usePathname() || "/"
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null
  if (pathname === "/chat-test" || pathname.startsWith("/chat-test/")) return null
  return (
    <ChatWidgetGuard>
      <ChatWidget />
    </ChatWidgetGuard>
  )
}
