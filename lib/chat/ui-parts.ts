import type { UIMessage } from "ai"

type ToolPart = {
  type: string
  state?: string
  toolName?: string
  input?: unknown
  output?: unknown
}

function asToolPart(part: UIMessage["parts"][number]): ToolPart | null {
  if (!part || typeof part !== "object") return null
  const raw = part as ToolPart
  if (typeof raw.type !== "string") return null
  if (raw.type.startsWith("tool-") || raw.type === "dynamic-tool" || raw.type === "tool-result") {
    return raw
  }
  return null
}

function toolNameOf(part: ToolPart): string {
  if (part.toolName) return part.toolName
  if (part.type.startsWith("tool-") && part.type !== "tool-result") {
    return part.type.slice("tool-".length)
  }
  return ""
}

export function getChatToolOutput<T>(message: UIMessage, toolName: string): T | null {
  for (const part of message.parts) {
    const tool = asToolPart(part)
    if (!tool) continue
    if (toolNameOf(tool) !== toolName) continue
    if (tool.state && tool.state !== "output-available") continue
    if (tool.output == null) continue
    return tool.output as T
  }
  return null
}

export function getChatToolInput<T>(message: UIMessage, toolName: string): T | null {
  for (const part of message.parts) {
    const tool = asToolPart(part)
    if (!tool) continue
    if (toolNameOf(tool) !== toolName) continue
    if (tool.input == null) continue
    return tool.input as T
  }
  return null
}
