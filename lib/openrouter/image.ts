import { getBaseUrl } from "@/lib/base-url"

const OPENROUTER_IMAGES_URL = "https://openrouter.ai/api/v1/images"

export type OpenRouterImageInput = {
  prompt: string
  aspectRatio: "9:16" | "1:1"
  inputReferenceUrls?: string[]
  model?: string
}

export type OpenRouterImageResult = {
  buffer: Buffer
  cost?: number
  model: string
}

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim()
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY no configurada. Agregala en .env.local para generar CTA/hitos con IA."
    )
  }
  return key
}

function getDefaultModel(): string {
  return process.env.OPENROUTER_IMAGE_MODEL?.trim() || "openai/gpt-5-image-mini"
}

export async function generateOpenRouterImage(
  input: OpenRouterImageInput
): Promise<OpenRouterImageResult> {
  const apiKey = getApiKey()
  const model = input.model ?? getDefaultModel()
  const baseUrl = getBaseUrl()

  const body: Record<string, unknown> = {
    model,
    prompt: input.prompt,
    aspect_ratio: input.aspectRatio,
    resolution: "2K",
    output_format: "png",
  }

  if (input.inputReferenceUrls?.length) {
    body.input_references = input.inputReferenceUrls.map((url) => ({
      image_url: { url },
    }))
  }

  const res = await fetch(OPENROUTER_IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": baseUrl,
      "X-Title": "Celimap Admin Social",
    },
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as {
    error?: { message?: string; code?: number }
    data?: Array<{ b64_json?: string }>
    usage?: { cost?: number }
  }

  if (!res.ok) {
    const msg = json.error?.message ?? `OpenRouter error ${res.status}`
    if (res.status === 402) {
      throw new Error("Créditos insuficientes en OpenRouter. Recargá tu cuenta.")
    }
    if (res.status === 401) {
      throw new Error("OPENROUTER_API_KEY inválida o sin permisos.")
    }
    throw new Error(msg)
  }

  const b64 = json.data?.[0]?.b64_json
  if (!b64) {
    throw new Error("OpenRouter no devolvió imagen (b64_json vacío).")
  }

  return {
    buffer: Buffer.from(b64, "base64"),
    cost: json.usage?.cost,
    model,
  }
}
