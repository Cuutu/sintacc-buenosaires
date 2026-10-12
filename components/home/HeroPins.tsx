import Image from "next/image"

/**
 * Pines de marca sobre el mapa nocturno del hero (decorativos).
 * Imágenes chicas (96px) en /public/brand/hero, no los PNG de 512px del mapa.
 */
// Todos terminan antes de los ~150px: el texto del hero arranca más abajo y no se pisan.
const HERO_PINS = [
  { src: "/brand/hero/pin-100-crema.png", left: "16%", top: 74, w: 24 },
  { src: "/brand/hero/pin-opciones.png", left: "40%", top: 58, w: 22 },
  { src: "/brand/hero/pin-100-crema.png", left: "60%", top: 84, w: 28 },
  { src: "/brand/hero/pin-opciones.png", left: "6%", top: 118, w: 20 },
  { src: "/brand/hero/pin-100-crema.png", left: "84%", top: 112, w: 20 },
  { src: "/brand/hero/pin-opciones.png", left: "73%", top: 126, w: 18 },
] as const

export function HeroPins() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[170px] max-w-5xl min-[769px]:top-[var(--desktop-nav-clearance)]"
    >
      {HERO_PINS.map((pin, i) => (
        <Image
          key={i}
          src={pin.src}
          alt=""
          width={96}
          height={129}
          className="absolute h-auto drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)]"
          style={{ left: pin.left, top: pin.top, width: pin.w }}
        />
      ))}
    </div>
  )
}
