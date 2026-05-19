import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const CATEGORY_CITY_PATTERN = /^\/([a-z0-9-]+)-sin-gluten\/([a-z0-9-]+)$/i
const CATEGORY_PATTERN = /^\/([a-z0-9-]+)-sin-gluten$/i
const TOP_CITY_PATTERN = /^\/top-sin-gluten-([a-z0-9-]+)$/i

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

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
    url.pathname = `/categoria/${category}/${ciudadSlug}`
    return NextResponse.rewrite(url)
  }

  const categoryMatch = pathname.match(CATEGORY_PATTERN)
  if (categoryMatch) {
    const [, category] = categoryMatch
    const url = request.nextUrl.clone()
    url.pathname = `/categoria/${category}`
    return NextResponse.rewrite(url)
  }

  const topCityMatch = pathname.match(TOP_CITY_PATTERN)
  if (topCityMatch) {
    const [, ciudadSlug] = topCityMatch
    const url = request.nextUrl.clone()
    url.pathname = `/top-sin-gluten/ciudad/${ciudadSlug}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
}
