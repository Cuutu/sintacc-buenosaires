import { NextResponse } from "next/server"
import { buildAppleAppSiteAssociation } from "@/lib/apple-app-site-association"

export const dynamic = "force-static"

/**
 * Universal Links de iOS. Apple lo baja de https://<dominio>/.well-known/apple-app-site-association
 * sin redirecciones y como JSON (el middleware no corre acá: el path tiene un punto).
 */
export function GET() {
  return NextResponse.json(buildAppleAppSiteAssociation(), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
  })
}
