"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Upload, X, Loader2 } from "lucide-react"

/** Matches server limit in app/api/upload/route.ts */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

type AllowedMime = (typeof ALLOWED_IMAGE_MIME_TYPES)[number]

type Props = {
  value: string[]
  onChange: (urls: string[]) => void
  maxCount?: number
  folder?: string
  disabled?: boolean
}

/** Client-side gate before upload. Returns user-facing Spanish error or null if OK. */
export function validateImageFile(file: File): string | null {
  if (!file || file.size <= 0) {
    return "No se pudo leer el archivo. Probá de nuevo o elegí otra imagen."
  }

  const mime = (file.type || "").toLowerCase() as AllowedMime | ""
  if (
    !mime ||
    !(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime)
  ) {
    return "Formato no permitido. Usá JPEG, PNG o WebP."
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return "La imagen no puede superar 5MB"
  }

  return null
}

export function ImageUpload({
  value = [],
  onChange,
  maxCount = 3,
  folder = "celimap",
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const aliveRef = useRef(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  const remaining = maxCount - value.length

  const resetInput = (input: HTMLInputElement | null) => {
    if (input) input.value = ""
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const fileList = input.files

    // Cancel action sheet / camera / picker → empty list or no onChange on some iOS paths.
    if (!fileList?.length || value.length >= maxCount || disabled) {
      resetInput(input)
      return
    }

    const toUpload = Array.from(fileList).slice(0, remaining)
    const invalid = toUpload.map(validateImageFile).find(Boolean)
    if (invalid) {
      if (aliveRef.current) setError(invalid)
      resetInput(input)
      return
    }

    if (aliveRef.current) {
      setError("")
      setUploading(true)
    }

    const newUrls: string[] = []

    try {
      for (const file of toUpload) {
        if (!aliveRef.current) break

        const formData = new FormData()
        formData.append("file", file)
        formData.append("folder", folder)

        let res: Response
        try {
          res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          })
        } catch {
          throw new Error(
            "No se pudo subir la imagen. Revisá la conexión e intentá de nuevo."
          )
        }

        if (!aliveRef.current) break

        let data: { url?: string; error?: string } = {}
        try {
          data = (await res.json()) as { url?: string; error?: string }
        } catch {
          throw new Error(
            res.ok
              ? "Respuesta inválida del servidor al subir la imagen."
              : "Error al subir"
          )
        }

        if (!res.ok) {
          throw new Error(data.error || "Error al subir")
        }

        if (data.url) {
          newUrls.push(data.url)
        }
      }

      if (aliveRef.current && newUrls.length > 0) {
        onChange([...value, ...newUrls])
      }
    } catch (err) {
      if (aliveRef.current) {
        setError(err instanceof Error ? err.message : "Error al subir")
      }
    } finally {
      if (aliveRef.current) setUploading(false)
      resetInput(input)
    }
  }

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <div key={url} className="relative group">
            <div className="w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted">
              <Image
                src={url}
                alt="Foto de lugar sin gluten"
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                aria-label="Quitar imagen"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {!disabled && value.length < maxCount && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  {remaining} restante{remaining !== 1 ? "s" : ""}
                </span>
              </>
            )}
          </button>
        )}
      </div>
      {/*
        No `capture` attribute: keep system action sheet (Camera / Photo Library / Files).
        Camera permission is requested by iOS only when user taps Take Photo — not on modal open.
      */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading || value.length >= maxCount}
      />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Máx. {maxCount} imágenes. JPEG, PNG o WebP. Hasta 5MB cada una.
      </p>
    </div>
  )
}
