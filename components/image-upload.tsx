"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Upload, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  value: string[]
  onChange: (urls: string[]) => void
  maxCount?: number
  folder?: string
  disabled?: boolean
}

export function ImageUpload({
  value = [],
  onChange,
  maxCount = 3,
  folder = "celimap",
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const remaining = maxCount - value.length

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length || value.length >= maxCount) return

    setError("")
    setUploading(true)

    try {
      const toUpload = Array.from(files).slice(0, remaining)
      const newUrls: string[] = []

      for (const file of toUpload) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("folder", folder)

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "Error al subir")
        }

        if (data.url) {
          newUrls.push(data.url)
        }
      }

      onChange([...value, ...newUrls])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir")
    } finally {
      setUploading(false)
      e.target.value = ""
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
                alt=""
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
        <p className="text-sm text-destructive">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Máx. {maxCount} imágenes. JPEG, PNG o WebP. Hasta 5MB cada una.
      </p>
    </div>
  )
}
