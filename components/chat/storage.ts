import type { UIMessage } from "ai"
import type { BuscarLugaresResult } from "@/lib/chat/buscar-lugares"
import type { BuscarListasResult } from "@/lib/chat/buscar-listas"
import { getChatToolInput, getChatToolOutput } from "@/lib/chat/ui-parts"

const STORAGE_KEY = "celimap-chat-v2"

type StoredMessage = {
  id: string
  role: "user" | "assistant"
  text: string
  zona?: string
  places?: BuscarLugaresResult
  lists?: BuscarListasResult
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
      .filter((item) => item && (item.role === "user" || item.role === "assistant"))
      .filter((item) => item.text || item.places || item.lists)
      .slice(-20)
      .map((item) => storedToMessage(item))
  } catch {
    return []
  }
}

function storedToMessage(item: StoredMessage): UIMessage {
  const parts: UIMessage["parts"] = []
  if (item.text) {
    parts.push({ type: "text", text: item.text })
  }
  if (item.places) {
    parts.push({
      type: "tool-buscarLugares",
      toolCallId: `stored-${item.id}-lugares`,
      state: "output-available",
      input: item.zona ? { zona: item.zona } : {},
      output: item.places,
    } as UIMessage["parts"][number])
  }
  if (item.lists) {
    parts.push({
      type: "tool-buscarListas",
      toolCallId: `stored-${item.id}-listas`,
      state: "output-available",
      input: item.zona ? { zona: item.zona } : {},
      output: item.lists,
    } as UIMessage["parts"][number])
  }
  if (parts.length === 0) {
    parts.push({ type: "text", text: "" })
  }
  return {
    id: item.id || `stored-${item.role}`,
    role: item.role,
    parts,
  }
}

export function saveChatHistory(messages: UIMessage[]): void {
  if (typeof window === "undefined") return
  const stored: StoredMessage[] = messages
    .map((message) => {
      const zona = getChatToolInput<{ zona?: string }>(message, "buscarLugares")?.zona
      return {
        id: message.id,
        role: (message.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
        text: textFromMessage(message),
        zona,
        places: getChatToolOutput<BuscarLugaresResult>(message, "buscarLugares") || undefined,
        lists: getChatToolOutput<BuscarListasResult>(message, "buscarListas") || undefined,
      }
    })
    .filter((item) => item.role === "user" || item.role === "assistant")
    .filter((item) => item.text || item.places || item.lists)
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // quota / private mode
  }
}

export function chatMessageText(message: UIMessage): string {
  return textFromMessage(message)
}
