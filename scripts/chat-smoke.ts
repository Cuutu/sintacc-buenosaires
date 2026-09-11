import { mkdirSync, writeFileSync } from "fs"
import { dirname, resolve } from "path"
import { loadEnvFiles } from "./load-env"

loadEnvFiles()

const BASE_URL = (process.env.CHAT_SMOKE_URL || "http://localhost:3000").replace(/\/$/, "")
const OUT_PATH = resolve(process.cwd(), "tmp/chat-smoke.md")

const QUERIES: { id: string; title: string; text: string }[] = [
  {
    id: "1-barrio",
    title: "Búsqueda por barrio",
    text: "Hay alguna panadería sin TACC en Palermo?",
  },
  {
    id: "2-ciudad",
    title: "Búsqueda por ciudad",
    text: "Restaurantes sin gluten en Córdoba capital",
  },
  {
    id: "3-cerca",
    title: "Cerca mío",
    text: "Buscame lugares cerca mío, estoy en -34.588, -58.430",
  },
  {
    id: "4-cien",
    title: "Solo 100% sin TACC",
    text: "Solo lugares 100% sin TACC en Villa Crespo, nada con contaminación cruzada",
  },
  {
    id: "5-vacio",
    title: "Zona sin resultados",
    text: "Hay algún café sin TACC en Tolhuin, Tierra del Fuego?",
  },
  {
    id: "6-medica",
    title: "Pregunta médica",
    text: "Tengo hinchazón y diarrea, ¿soy celíaca? Qué tratamiento me conviene?",
  },
  {
    id: "7-producto",
    title: "Producto puntual",
    text: "Las galletitas Oreo son aptas sin TACC?",
  },
  {
    id: "8-offtopic",
    title: "Tema no relacionado",
    text: "Quién gana el clásico Boca-River este domingo?",
  },
]

type ToolCall = { name: string; args: unknown }

type SmokeResult = {
  id: string
  title: string
  query: string
  status: number
  text: string
  toolCalled: boolean
  toolCalls: ToolCall[]
  steps: number
  inputTokens: number
  outputTokens: number
  error?: string
}

function parseSse(raw: string): Omit<SmokeResult, "id" | "title" | "query" | "status"> {
  const textChunks: string[] = []
  const toolCalls: ToolCall[] = []
  let steps = 0
  let inputTokens = 0
  let outputTokens = 0
  let error: string | undefined

  const applyMetadata = (meta: unknown) => {
    if (!meta || typeof meta !== "object") return
    const record = meta as Record<string, unknown>
    if (typeof record.inputTokens === "number") inputTokens = record.inputTokens
    if (typeof record.outputTokens === "number") outputTokens = record.outputTokens
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed.startsWith("data:")) continue
    const payload = trimmed.slice(5).trim()
    if (!payload || payload === "[DONE]") continue
    let json: Record<string, unknown>
    try {
      json = JSON.parse(payload) as Record<string, unknown>
    } catch {
      continue
    }
    const type = String(json.type ?? "")
    if (type === "text-delta") {
      const chunk = json.delta ?? json.text
      if (typeof chunk === "string") textChunks.push(chunk)
    }
    if (type === "start-step") steps += 1
    if (type === "tool-input-available" || type === "tool-call") {
      toolCalls.push({
        name: String(json.toolName ?? json.tool ?? "buscarLugares"),
        args: json.input ?? json.args ?? json.arguments,
      })
    }
    if (type === "error") {
      error =
        typeof json.errorText === "string"
          ? json.errorText
          : typeof json.error === "string"
            ? json.error
            : JSON.stringify(json.error ?? json)
    }
    if (json.messageMetadata) applyMetadata(json.messageMetadata)
  }

  return {
    text: textChunks.join("").trim(),
    toolCalled: toolCalls.length > 0,
    toolCalls,
    steps,
    inputTokens,
    outputTokens,
    error,
  }
}

async function waitForServer(url: string, attempts = 20): Promise<void> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { method: "GET" })
      if (res.ok || res.status === 404 || res.status === 405) return
    } catch {
      // still booting
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000))
  }
  throw new Error(`No hay next dev en ${url}. Arrancalo con npm run dev.`)
}

async function runQuery(item: (typeof QUERIES)[number]): Promise<SmokeResult> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          id: `smoke-${item.id}`,
          role: "user",
          parts: [{ type: "text", text: item.text }],
        },
      ],
    }),
  })
  const raw = await res.text()
  if (!res.ok) {
    let message = raw
    try {
      const json = JSON.parse(raw) as { error?: string }
      if (json.error) message = json.error
    } catch {
      // keep raw
    }
    return {
      id: item.id,
      title: item.title,
      query: item.text,
      status: res.status,
      text: "",
      toolCalled: false,
      toolCalls: [],
      steps: 0,
      inputTokens: 0,
      outputTokens: 0,
      error: message,
    }
  }
  const parsed = parseSse(raw)
  return {
    id: item.id,
    title: item.title,
    query: item.text,
    status: res.status,
    ...parsed,
  }
}

function formatResult(result: SmokeResult): string {
  const args =
    result.toolCalls.length === 0
      ? "ninguno"
      : result.toolCalls
          .map((call) => `${call.name} ${JSON.stringify(call.args, null, 2)}`)
          .join("\n")
  return [
    `## ${result.id} — ${result.title}`,
    "",
    `**Query:** ${result.query}`,
    `**HTTP:** ${result.status}`,
    `**Tool llamada:** ${result.toolCalled ? "sí" : "no"}`,
    `**Pasos:** ${result.steps}`,
    `**Tokens:** input ${result.inputTokens} / output ${result.outputTokens}`,
    "",
    "**Argumentos de la tool:**",
    "```",
    args,
    "```",
    "",
    "**Respuesta:**",
    result.error ? `ERROR: ${result.error}` : result.text || "(vacía)",
    "",
  ].join("\n")
}

async function main() {
  await waitForServer(BASE_URL)
  const results: SmokeResult[] = []
  for (const query of QUERIES) {
    process.stdout.write(`smoke ${query.id}...\n`)
    results.push(await runQuery(query))
    await new Promise((resolveWait) => setTimeout(resolveWait, 800))
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  const body = [
    `# Chat smoke ${new Date().toISOString()}`,
    "",
    `Base: ${BASE_URL}`,
    "",
    ...results.map(formatResult),
  ].join("\n")
  writeFileSync(OUT_PATH, body, "utf8")
  process.stdout.write(`OK ${OUT_PATH}\n`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
