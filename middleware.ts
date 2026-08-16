import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import {
  buildWwwRedirectUrl,
  isApexCelimapHost,
  resolveTopSinGlutenRedirect,
} from "@/lib/seo/canonical-redirects"
const CATEGORY_CITY_PATTERN = /^\/([a-z0-9-]+)-sin-gluten\/([a-z0-9-]+)$/i
const CATEGORY_PATTERN = /^\/([a-z0-9-]+)-sin-gluten$/i

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const host = request.headers.get("host")

  // Apex → www (301 permanente; conserva path + query)
  if (isApexCelimapHost(host)) {
    const target = buildWwwRedirectUrl({
      pathname: request.nextUrl.pathname,
      search: request.nextUrl.search,
    })
    return NextResponse.redirect(target, 301)
  }

  if (pathname.startsWith("/admin")) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })
    if (!token || token.role !== "admin") {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = "/login"
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  const categoryCityMatch = pathname.match(CATEGORY_CITY_PATTERN)
  if (categoryCityMatch) {
    const [, category, ciudadSlug] = categoryCityMatch
    const url = request.nextUrl.clone()
    url.pathname = `/sin-gluten/${ciudadSlug}/${category}`
    return NextResponse.redirect(url, 301)
  }

  const categoryMatch = pathname.match(CATEGORY_PATTERN)
  if (categoryMatch) {
    const [, category] = categoryMatch
    const url = request.nextUrl.clone()
    url.pathname = `/categoria/${category}`
    return NextResponse.rewrite(url)
  }

  // Sin ranking real → 301 a página de ciudad (no rewrite)
  const topTarget = resolveTopSinGlutenRedirect(pathname)
  if (topTarget) {
    const url = request.nextUrl.clone()
    url.pathname = topTarget
    return NextResponse.redirect(url, 301)
  }

  if (pathname.startsWith("/listas/privadas")) {
    const response = NextResponse.next()
    response.headers.set("Cache-Control", "private, no-store")
    response.headers.set("Referrer-Policy", "no-referrer")
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
}
