import type { MetadataRoute } from "next"
import { getBaseUrl } from "@/lib/base-url"

export default function robots(): MetadataRoute.Robots {
  const base = getBaseUrl()
  return {
    rules: [
      {
        userAgent: [
          "OAI-SearchBot",
          "ChatGPT-User",
          "GPTBot",
          "PerplexityBot",
          "ClaudeBot",
          "anthropic-ai",
          "Google-Extended",
          "Applebot-Extended",
        ],
        allow: "/",
        disallow: ["/admin", "/api/", "/login", "/perfil", "/favoritos", "/listas/privadas"],
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/login", "/perfil", "/favoritos", "/listas/privadas"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
