"use client"

import { MapPin } from "lucide-react"
import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import { linkifyBareUrls } from "@/lib/chat/linkify"
import { followChatHref, isLocalChatHref, toLocalChatHref } from "@/lib/chat/place-links"
import { sanitizeChatVisibleText } from "@/lib/chat/sanitize-visible"

function isCeliMapHref(href?: string): boolean {
  if (!href) return false
  if (href.startsWith("/") && !href.startsWith("//")) return true
  try {
    const url = new URL(href, "https://www.celimap.com.ar")
    const host = url.hostname.replace(/^www\./, "").toLowerCase()
    return host === "celimap.com.ar"
  } catch {
    return false
  }
}

export function ChatMarkdown({
  text,
  onNavigate,
}: {
  text: string
  onNavigate?: () => void
}) {
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeSanitize]}
      components={{
        a({ href, children }) {
          const localHref = href ? toLocalChatHref(href) : undefined
          const internal = isCeliMapHref(href)
          return (
            <a
              href={localHref || href}
              className="font-semibold text-[#B64320] no-underline underline-offset-2 hover:underline"
              target={internal ? undefined : "_blank"}
              rel={internal ? undefined : "noopener noreferrer"}
              onClick={(event) => {
                if (localHref && isLocalChatHref(localHref)) {
                  followChatHref(event, localHref, onNavigate)
                }
              }}
            >
              {children}
            </a>
          )
        },
        ul({ children }) {
          return <ul className="my-2 list-none space-y-1.5 pl-0">{children}</ul>
        },
        ol({ children }) {
          return <ol className="my-2 list-none space-y-1.5 pl-0">{children}</ol>
        },
        li({ children }) {
          return (
            <li className="flex gap-2">
              <MapPin
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1F4D35]/70"
                strokeWidth={2.2}
                aria-hidden
              />
              <span className="min-w-0 flex-1">{children}</span>
            </li>
          )
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>
        },
        strong({ children }) {
          return <strong className="font-semibold">{children}</strong>
        },
      }}
    >
      {linkifyBareUrls(sanitizeChatVisibleText(text))}
    </ReactMarkdown>
  )
}
