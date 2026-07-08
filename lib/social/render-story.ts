import { readFile } from "fs/promises"
import path from "path"
import { ImageResponse } from "@vercel/og"
import type { ImageFormat } from "@/lib/social/image-prompt"
import type { SocialContentItem, SocialPreset } from "@/lib/social/types"
import { StoryListImage, buildStoryTemplateProps } from "@/lib/social/story-template"

const FONT_DIR = path.join(
  process.cwd(),
  "node_modules",
  "@fontsource",
  "dm-sans",
  "files"
)

async function loadFonts() {
  const [regular, semibold, bold] = await Promise.all([
    readFile(path.join(FONT_DIR, "dm-sans-latin-400-normal.woff")),
    readFile(path.join(FONT_DIR, "dm-sans-latin-600-normal.woff")),
    readFile(path.join(FONT_DIR, "dm-sans-latin-700-normal.woff")),
  ])
  return [
    { name: "DM Sans", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "DM Sans", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "DM Sans", data: bold, weight: 700 as const, style: "normal" as const },
  ]
}

export async function renderStoryPng(input: {
  preset: SocialPreset
  items: SocialContentItem[]
  format: ImageFormat
  includeLogo?: boolean
}): Promise<Buffer> {
  const props = buildStoryTemplateProps(input)
  const fonts = await loadFonts()
  const width = 1080
  const height = input.format === "story" ? 1920 : 1080

  const response = new ImageResponse(StoryListImage(props), {
    width,
    height,
    fonts,
  })

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
