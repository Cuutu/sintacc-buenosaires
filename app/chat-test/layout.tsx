import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { isChatTestEnabled } from "@/lib/chat/config"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Chat test",
  robots: { index: false, follow: false },
}

export default function ChatTestLayout({ children }: { children: React.ReactNode }) {
  if (!isChatTestEnabled()) notFound()
  return children
}
