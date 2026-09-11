"use client"

import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"

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

export function ChatMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeSanitize]}
      components={{
        a({ href, children }) {
          const internal = isCeliMapHref(href)
          return (
            <a
              href={href}
              className="font-semibold underline decoration-[#B64320]/40 underline-offset-2 hover:decoration-[#B64320]"
              target={internal ? undefined : "_blank"}
              rel={internal ? undefined : "noopener noreferrer"}
            >
              {children}
            </a>
          )
        },
        ul({ children }) {
          return <ul className="my-2 list-disc space-y-1 pl-4">{children}</ul>
        },
        ol({ children }) {
          return <ol className="my-2 list-decimal space-y-1 pl-4">{children}</ol>
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>
        },
        strong({ children }) {
          return <strong className="font-semibold">{children}</strong>
        },
      }}
    >
      {text}
    </ReactMarkdown>
  )
}
