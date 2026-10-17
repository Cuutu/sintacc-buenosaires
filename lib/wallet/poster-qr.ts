/**
 * QR del cartel del mostrador: la matriz la arma `qrcode` y acá se dibuja como SVG,
 * con los tres ojos redondeados y un hueco en el centro para la espiga de CeliMap.
 */

import { create } from "qrcode"

/** Margen blanco alrededor del QR, en módulos (el estándar pide 4). */
export const QR_QUIET_ZONE = 4

const EYE = 7

export type PosterQr = {
  /** Módulos por lado, sin el margen. */
  size: number
  /** Módulos de datos, sin los ojos ni el hueco del logo. */
  dataPath: string
  /** Aro (se pinta con fill-rule evenodd) y centro de cada ojo. */
  eyes: Array<{ ring: string; dot: string }>
  /** Hueco para el logo, en módulos; null si el QR no deja lugar. */
  logo: { x: number; y: number; size: number } | null
}

/** Rectángulo con esquinas redondeadas como path SVG. */
function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  return (
    `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}` +
    `a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}` +
    `v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`
  )
}

function inBox(x: number, y: number, box: { x: number; y: number; size: number }): boolean {
  return x >= box.x && x < box.x + box.size && y >= box.y && y < box.y + box.size
}

export function posterQr(text: string): PosterQr {
  // Q corrige hasta un 25% del código: alcanza de sobra para tapar el centro con el logo.
  const { modules, version } = create(text, { errorCorrectionLevel: "Q" })
  const size = modules.size

  const eyeBoxes = [
    { x: 0, y: 0, size: EYE },
    { x: size - EYE, y: 0, size: EYE },
    { x: 0, y: size - EYE, size: EYE },
  ]
  // Desde la versión 7 hay un patrón de alineación justo en el centro: ahí no se tapa nada.
  // El link de la tarjeta entra en la 5 o la 6.
  let logo: PosterQr["logo"] = null
  if (version < 7) {
    // Impar, para que quede centrado, y no más de un 20% del ancho.
    let side = Math.floor(size * 0.2)
    if (side % 2 === 0) side -= 1
    const start = (size - side) / 2
    logo = { x: start, y: start, size: side }
  }

  let dataPath = ""
  for (let y = 0; y < size; y++) {
    let x = 0
    while (x < size) {
      const skip = (col: number) =>
        !modules.get(y, col) || eyeBoxes.some((b) => inBox(col, y, b)) || (logo !== null && inBox(col, y, logo))
      if (skip(x)) {
        x++
        continue
      }
      let run = 1
      while (x + run < size && !skip(x + run)) run++
      dataPath += `M${x} ${y}h${run}v1h${-run}z`
      x += run
    }
  }

  const eyes = eyeBoxes.map(({ x, y }) => ({
    ring: roundedRect(x, y, EYE, EYE, 2) + roundedRect(x + 1, y + 1, EYE - 2, EYE - 2, 1.2),
    dot: roundedRect(x + 2, y + 2, 3, 3, 0.9),
  }))

  return { size, dataPath, eyes, logo }
}
