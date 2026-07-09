import { getBaseUrl } from "@/lib/base-url"
import { z } from "zod"

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"

export type OpenRouterChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type OpenRouterChatResult<T> = {
  data: T
  cost?: number
  model: string
}

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim()
  if (!key) {
    throw new Error("OPENROUTER_API_KEY no configurada.")
  }
  return key
}

function getDefaultModel(): string {
  return process.env.OPENROUTER_TEXT_MODEL?.trim() || "openai/gpt-4.1-mini"
}

export async function openRouterChatJson<T>(input: {
  messages: OpenRouterChatMessage[]
  schema: z.ZodType<T>
  model?: string
}): Promise<OpenRouterChatResult<T>> {
  const apiKey = getApiKey()
  const model = input.model ?? getDefaultModel()
  const baseUrl = getBaseUrl()

  const res = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": baseUrl,
      "X-Title": "Celimap Place Research",
    },
    body: JSON.stringify({
      model,
      messages: input.messages,
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  })

  const json = (await res.json()) as {
    error?: { message?: string }
    choices?: Array<{ message?: { content?: string } }>
    usage?: { cost?: number }
  }

  if (!res.ok) {
    const msg = json.error?.message ?? `OpenRouter error ${res.status}`
    if (res.status === 402) throw new Error("Créditos insuficientes en OpenRouter.")
    if (res.status === 401) throw new Error("OPENROUTER_API_KEY inválida.")
    throw new Error(msg)
  }

  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error("OpenRouter no devolvió contenido.")

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error("OpenRouter devolvió JSON inválido.")
  }

  const data = input.schema.parse(parsed)

  return {
    data,
    cost: json.usage?.cost,
    model,
  }
}
