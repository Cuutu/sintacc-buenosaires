/**
 * @jest-environment node
 *
 * Next.js reemplaza `openGraph` completo (no hace merge con el layout raíz):
 * un bloque sin `images` deja la página sin og:image y WhatsApp/Facebook
 * muestran el link sin imagen. Cada `openGraph` debe declarar `images`.
 */
import { readFileSync, readdirSync, statSync } from "fs"
import path from "path"

const root = path.join(__dirname, "../../..")

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(full)
  }
  return out
}

function openGraphBlocks(src: string): string[] {
  const blocks: string[] = []
  const re = /openGraph\s*:\s*\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    let i = re.lastIndex
    let depth = 1
    while (depth > 0 && i < src.length) {
      if (src[i] === "{") depth++
      else if (src[i] === "}") depth--
      i++
    }
    blocks.push(src.slice(m.index, i))
  }
  return blocks
}

describe("og:image en todas las páginas", () => {
  const files = [
    ...walk(path.join(root, "app")),
    path.join(root, "lib/seo/mapa-metadata.ts"),
    path.join(root, "lib/seo/place-metadata.ts"),
    path.join(root, "lib/venture-seo.ts"),
  ]

  it.each(files.map((f) => [path.relative(root, f)]))("%s", (rel) => {
    const src = readFileSync(path.join(root, rel), "utf8")
    for (const block of openGraphBlocks(src)) {
      expect(block).toMatch(/images\s*:/)
    }
  })
})
