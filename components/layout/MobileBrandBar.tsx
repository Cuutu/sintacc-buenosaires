import Link from "next/link"
import { BrandLogo } from "@/components/brand/BrandLogo"

/** Rutas con marca propia arriba (home: hero; mapa: barra de búsqueda; ficha: foto;
 *  login: logo grande). En el resto, el celular no mostraba CeliMap en ningún lado. */
export function shouldShowMobileBrandBar(pathname: string): boolean {
  if (pathname === "/" || pathname === "/login") return false
  if (pathname === "/mapa" || pathname.startsWith("/mapa/")) return false
  if (pathname.startsWith("/lugar/")) return false
  return true
}

/**
 * Logo arriba en el celular. Se renderiza en el servidor (sin salto al cargar) y se
 * esconde con CSS desde 769 px, donde está la barra flotante de compu.
 */
export function MobileBrandBar() {
  return (
    <div className="flex h-[52px] items-center border-b border-[#E6DFD2] bg-[#F7F3EB] px-4 min-[769px]:hidden">
      <Link
        href="/"
        aria-label="CeliMap, ir al inicio"
        className="inline-flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/40"
      >
        <BrandLogo markOnly size="xs" />
        <span className="font-display text-lg font-extrabold tracking-[-0.03em] text-olive">CeliMap</span>
      </Link>
    </div>
  )
}
