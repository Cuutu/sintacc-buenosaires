"use client"

import { useEffect, useState } from "react"
import { Check, Copy, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = { url: string; placeName: string }

/** El local copia o comparte el link de su tarjeta (WhatsApp, Instagram, la bio). */
export function ShareCardLink({ url, placeName }: Props) {
  const [copied, setCopied] = useState(false)
  // Se averigua después de montar: en el servidor no hay navigator.
  const [canShare, setCanShare] = useState(false)
  useEffect(() => setCanShare(typeof navigator.share === "function"), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  async function share() {
    try {
      await navigator.share({
        title: `Tarjeta de sellos · ${placeName}`,
        text: `Guardá la tarjeta de sellos de ${placeName} en tu celu:`,
        url,
      })
    } catch {
      // Cancelar no es un error.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="break-all rounded-xl border border-[#E8E1D6] bg-white px-3 py-2 text-xs text-olive/80">{url}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={copy}>
          {copied ? <Check className="mr-2 h-4 w-4" aria-hidden /> : <Copy className="mr-2 h-4 w-4" aria-hidden />}
          {copied ? "¡Copiado!" : "Copiar link"}
        </Button>
        {canShare && (
          <Button variant="outline" onClick={share}>
            <Share2 className="mr-2 h-4 w-4" aria-hidden />
            Compartir
          </Button>
        )}
      </div>
    </div>
  )
}
