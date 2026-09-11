import type { UIMessage } from "ai"

const STORAGE_KEY = "celimap-chat-v1"

type StoredMessage = {
  id: string
  role: "user" | "assistant"
  text: string
}

function textFromMessage(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim()
}

export function loadChatHistory(): UIMessage[] {
  if (typeof window === "undefined") return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredMessage[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && (item.role === "user" || item.role === "assistant") && item.text)
      .slice(-20)
      .map((item) => ({
        id: item.id || `stored-${item.role}`,
        role: item.role,
        parts: [{ type: "text" as const, text: item.text }],
      }))
  } catch {
    return []
  }
}

export function saveChatHistory(messages: UIMessage[]): void {
  if (typeof window === "undefined") return
  const stored: StoredMessage[] = messages
    .map((message) => ({
      id: message.id,
      role: message.role === "assistant" ? "assistant" : "user",
      text: textFromMessage(message),
    }))
    .filter((item) => item.role === "user" || item.role === "assistant")
    .filter((item) => item.text)
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // quota / private mode
  }
}

export function chatMessageText(message: UIMessage): string {
  return textFromMessage(message)
}
