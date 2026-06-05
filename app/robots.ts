import type { MetadataRoute } from "next"
import { getBaseUrl } from "@/lib/base-url"

export default function robots(): MetadataRoute.Robots {
  const base = getBaseUrl()
  return {
    rules: [
      {
        userAgent: ["OAI-SearchBot", "ChatGPT-User", "GPTBot"],
        allow: "/",
        disallow: ["/admin", "/api/", "/login", "/perfil", "/favoritos"],
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/login", "/perfil", "/favoritos"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
