import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
} from "ai"
import { NextRequest, NextResponse } from "next/server"
import { buscarLugares, buscarLugaresInputSchema } from "@/lib/chat/buscar-lugares"
import {
  CHAT_MAX_OUTPUT_TOKENS,
  CHAT_MAX_PAYLOAD_CHARS,
  CHAT_MAX_STEPS,
  getChatModelId,
  getChatRateLimitConfig,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
} from "@/lib/chat/config"
import {
  CHAT_FRIENDLY_CONFIG_ERROR,
  CHAT_FRIENDLY_ERROR,
  getFriendlyChatError,
} from "@/lib/chat/errors"
import { parseChatMessages } from "@/lib/chat/messages"
import { CHAT_SYSTEM_PROMPT } from "@/lib/chat/system-prompt"
import { logger } from "@/lib/logger"
import { checkRateLimitByIp } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

function jsonError(message: string, status: number, retryAfterSeconds?: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(retryAfterSeconds
          ? { "Retry-After": String(retryAfterSeconds) }
          : {}),
      },
    }
  )
}

function logChatError(error: unknown, status: number) {
  logger.error({
    route: "/api/chat",
    status,
    error: error instanceof Error ? error.message : String(error),
  })
}

export async function POST(request: NextRequest) {
  const apiKey = getOpenRouterApiKey()
  if (!apiKey) {
    return jsonError(CHAT_FRIENDLY_CONFIG_ERROR, 503)
  }

  try {
    const rate = getChatRateLimitConfig()
    const limit = await checkRateLimitByIp(
      request,
      rate.type,
      rate.maxCount,
      rate.windowMinutes
    )
    if (!limit.allowed) {
      return jsonError(
        "Llegaste al tope de mensajes por ahora. Probá de nuevo en un rato.",
        429,
        limit.retryAfterSeconds
      )
    }
  } catch (error) {
    logChatError(error, 503)
    return jsonError(CHAT_FRIENDLY_ERROR, 503)
  }

  let raw: string
  try {
    raw = await request.text()
  } catch {
    return jsonError("El mensaje no se pudo leer.", 400)
  }
  if (raw.length > CHAT_MAX_PAYLOAD_CHARS) {
    return jsonError("El mensaje es muy largo.", 400)
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return jsonError("El mensaje no se pudo leer.", 400)
  }

  const parsed = parseChatMessages(json)
  if (!parsed.ok) {
    return jsonError(parsed.error.message, 400)
  }

  let modelMessages
  try {
    modelMessages = convertToModelMessages(parsed.messages, {
      ignoreIncompleteToolCalls: true,
    })
  } catch (error) {
    logChatError(error, 400)
    return jsonError("No pude leer el historial del chat. Probá mandar el mensaje de nuevo.", 400)
  }

  const model = getChatModelId()
  const openrouter = createOpenRouter({
    apiKey,
    compatibility: "strict",
    headers: getOpenRouterHeaders(),
  })

  try {
    const result = streamText({
      model: openrouter(model),
      system: CHAT_SYSTEM_PROMPT,
      messages: modelMessages,
      maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
      stopWhen: stepCountIs(CHAT_MAX_STEPS),
      temperature: 0.3,
      tools: {
        buscarLugares: tool({
          description:
            "Busca lugares sin TACC en la base de CeliMap. Usala siempre que la persona pida restaurantes, cafés, panaderías u otros lugares. Nunca inventes lugares. No devuelve lugares sin información confirmada sobre TACC.",
          inputSchema: buscarLugaresInputSchema,
          execute: async (input) => {
            try {
              return await buscarLugares(input)
            } catch (error) {
              logChatError(error, 500)
              return {
                encontrados: 0,
                lugares: [],
                error:
                  "No pude consultar la base de lugares. Pedile a la persona que pruebe de nuevo.",
              }
            }
          },
        }),
      },
      onError({ error }) {
        logChatError(error, 502)
      },
      onFinish({ steps, totalUsage }) {
        const toolCalled = steps.some(
          (step) => (step.toolCalls?.length ?? 0) > 0 || (step.toolResults?.length ?? 0) > 0
        )
        logger.info({
          route: "/api/chat",
          model,
          steps: steps.length,
          inputTokens: totalUsage?.inputTokens ?? 0,
          outputTokens: totalUsage?.outputTokens ?? 0,
          toolCalled,
        })
      },
    })

    return result.toUIMessageStreamResponse({
      onError: getFriendlyChatError,
      messageMetadata: ({ part }) => {
        if (part.type !== "finish") return undefined
        return {
          inputTokens: part.totalUsage.inputTokens ?? 0,
          outputTokens: part.totalUsage.outputTokens ?? 0,
        }
      },
    })
  } catch (error) {
    logChatError(error, 502)
    return jsonError(getFriendlyChatError(error), 502)
  }
}
