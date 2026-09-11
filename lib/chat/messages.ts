import { z } from "zod"
import type { UIMessage } from "ai"
import {
  CHAT_MAX_ASSISTANT_MESSAGE_CHARS,
  CHAT_MAX_HISTORY_CHARS,
  CHAT_MAX_HISTORY_MESSAGES,
  CHAT_MAX_USER_MESSAGE_CHARS,
} from "@/lib/chat/config"

const chatPartSchema = z
  .object({
    type: z.string(),
    text: z.unknown().optional(),
  })
  .passthrough()

const chatMessageSchema = z.object({
  id: z.string().max(128).optional(),
  role: z.enum(["user", "assistant"]),
  parts: z.array(chatPartSchema).min(1).max(40),
})

export const chatRequestBodySchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(40),
})

export type ChatRequestParseError = {
  code: "role" | "empty" | "message_too_long" | "history_too_long" | "invalid"
  message: string
}

export type ChatRequestParseResult =
  | { ok: true; messages: UIMessage[] }
  | { ok: false; error: ChatRequestParseError }

function textFromParts(parts: Array<Record<string, unknown>>): string {
  return parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => (part.text as string).trim())
    .filter(Boolean)
    .join("\n")
    .trim()
}

export function getUiMessageText(message: Pick<UIMessage, "parts">): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim()
}

export function getLastUserMessageText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.role === "user") return getUiMessageText(message)
  }
  return ""
}

export function trimChatMessages(messages: UIMessage[]): UIMessage[] {
  const sliced = messages.slice(-CHAT_MAX_HISTORY_MESSAGES)
  const firstUser = sliced.findIndex((message) => message.role === "user")
  if (firstUser <= 0) return sliced
  return sliced.slice(firstUser)
}

export function parseChatMessages(input: unknown): ChatRequestParseResult {
  const parsed = chatRequestBodySchema.safeParse(input)
  if (!parsed.success) {
    const hasBadRole = parsed.error.issues.some(
      (issue) => issue.path.includes("role") || String(issue.message).includes("role")
    )
    return {
      ok: false,
      error: {
        code: hasBadRole ? "role" : "invalid",
        message: hasBadRole
          ? "El historial del chat no es válido."
          : "Mandá un mensaje para empezar.",
      },
    }
  }

  const sanitized: UIMessage[] = []
  let totalChars = 0

  for (const raw of parsed.data.messages) {
    const text = textFromParts(raw.parts)
    if (!text) continue
    const maxChars =
      raw.role === "user" ? CHAT_MAX_USER_MESSAGE_CHARS : CHAT_MAX_ASSISTANT_MESSAGE_CHARS
    if (text.length > maxChars) {
      return {
        ok: false,
        error: {
          code: "message_too_long",
          message: `Un mensaje es muy largo. Máximo ${maxChars} caracteres.`,
        },
      }
    }
    totalChars += text.length
    if (totalChars > CHAT_MAX_HISTORY_CHARS) {
      return {
        ok: false,
        error: {
          code: "history_too_long",
          message: "El historial del chat es muy largo. Empezá un chat nuevo.",
        },
      }
    }
    sanitized.push({
      id: raw.id ?? `msg-${sanitized.length}`,
      role: raw.role,
      parts: [{ type: "text", text }],
    })
  }

  if (sanitized.length === 0) {
    return {
      ok: false,
      error: { code: "empty", message: "Mandá un mensaje para empezar." },
    }
  }

  const trimmed = trimChatMessages(sanitized)
  if (!getLastUserMessageText(trimmed)) {
    return {
      ok: false,
      error: { code: "empty", message: "Mandá un mensaje para empezar." },
    }
  }

  return { ok: true, messages: trimmed }
}
