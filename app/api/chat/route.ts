import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
} from "ai"
import { NextRequest, NextResponse } from "next/server"
import { buscarLugares, buscarLugaresInputSchema } from "@/lib/chat/buscar-lugares"
import { buscarListas, buscarListasInputSchema } from "@/lib/chat/buscar-listas"
import {
  CHAT_MAX_OUTPUT_TOKENS,
  CHAT_MAX_PAYLOAD_CHARS,
  CHAT_MAX_STEPS,
  getChatModelId,
  getChatRateLimitConfig,
  getChatOpenRouterApiKey,
  getOpenRouterHeaders,
} from "@/lib/chat/config"
import {
  CHAT_FRIENDLY_CONFIG_ERROR,
  CHAT_FRIENDLY_ERROR,
  getChatErrorStatus,
  getFriendlyChatError,
  sanitizeChatErrorMessage,
} from "@/lib/chat/errors"
import { parseChatMessages } from "@/lib/chat/messages"
import { buildChatSystemPrompt } from "@/lib/chat/system-prompt"
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
    outcome: "error",
    status,
    errorStatus: status,
    error: sanitizeChatErrorMessage(error),
  })
}

function logChatFinish(opts: {
  model: string
  steps: number
  inputTokens: number
  outputTokens: number
  toolCalled: boolean
  finishReason: string
  errorStatus?: number
}) {
  const failed = opts.finishReason === "error" || opts.errorStatus != null
  logger[failed ? "error" : "info"]({
    route: "/api/chat",
    outcome: failed ? "error" : "ok",
    model: opts.model,
    steps: opts.steps,
    inputTokens: opts.inputTokens,
    outputTokens: opts.outputTokens,
    toolCalled: opts.toolCalled,
    finishReason: opts.finishReason,
    ...(failed
      ? { errorStatus: opts.errorStatus ?? 502 }
      : {}),
  })
}

export async function POST(request: NextRequest) {
  const apiKey = getChatOpenRouterApiKey()
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

  let providerErrorStatus: number | undefined

  try {
    const result = streamText({
      model: openrouter(model),
      system: buildChatSystemPrompt(parsed.location),
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
            const withUserLocation = {
              ...input,
              lat: input.lat ?? parsed.location?.lat,
              lng: input.lng ?? parsed.location?.lng,
            }
            try {
              return await buscarLugares(withUserLocation)
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
        buscarListas: tool({
          description:
            "Busca listas públicas de CeliMap por barrio o ciudad. Usala junto con buscarLugares cuando pidan lugares de una zona. Nunca inventes listas.",
          inputSchema: buscarListasInputSchema,
          execute: async (input) => {
            try {
              return await buscarListas(input)
            } catch (error) {
              logChatError(error, 500)
              return {
                encontradas: 0,
                listas: [],
                error:
                  "No pude consultar las listas. Pedile a la persona que pruebe de nuevo.",
              }
            }
          },
        }),
      },
      onError({ error }) {
        providerErrorStatus = getChatErrorStatus(error)
        logChatError(error, providerErrorStatus)
      },
      onFinish({ steps, totalUsage, finishReason }) {
        const toolCalled = steps.some(
          (step) => (step.toolCalls?.length ?? 0) > 0 || (step.toolResults?.length ?? 0) > 0
        )
        logChatFinish({
          model,
          steps: steps.length,
          inputTokens: totalUsage?.inputTokens ?? 0,
          outputTokens: totalUsage?.outputTokens ?? 0,
          toolCalled,
          finishReason,
          errorStatus: providerErrorStatus,
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
    logChatError(error, getChatErrorStatus(error))
    return jsonError(getFriendlyChatError(error), getChatErrorStatus(error))
  }
}
