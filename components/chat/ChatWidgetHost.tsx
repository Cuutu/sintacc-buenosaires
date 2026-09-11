"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"

const ChatWidget = dynamic(
  () => import("@/components/chat/ChatWidget").then((mod) => mod.ChatWidget),
  { ssr: false }
)

export function ChatWidgetHost() {
  const pathname = usePathname() || "/"
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null
  if (pathname === "/chat-test" || pathname.startsWith("/chat-test/")) return null
  return <ChatWidget />
}
