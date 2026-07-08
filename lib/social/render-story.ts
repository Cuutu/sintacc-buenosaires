import { readFile } from "fs/promises"
import path from "path"
import type { ReactElement } from "react"
import { ImageResponse } from "@vercel/og"
import type { ImageFormat } from "@/lib/social/image-prompt"
import type { SocialContentItem, SocialMilestoneData, SocialPreset } from "@/lib/social/types"
import { StoryListImage, buildStoryTemplateProps } from "@/lib/social/story-template"
import {
  StoryCtaImage,
  StoryMilestoneImage,
  buildCtaTemplateProps,
  buildMilestoneTemplateProps,
} from "@/lib/social/story-campaign"

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

async function toPng(element: ReactElement, format: ImageFormat): Promise<Buffer> {
  const fonts = await loadFonts()
  const width = 1080
  const height = format === "story" ? 1920 : 1080
  const response = new ImageResponse(element, { width, height, fonts })
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function renderStoryPng(input: {
  preset: SocialPreset
  items: SocialContentItem[]
  format: ImageFormat
  includeLogo?: boolean
}): Promise<Buffer> {
  const props = buildStoryTemplateProps(input)
  return toPng(StoryListImage(props), input.format)
}

export async function renderCtaPng(input: {
  format: ImageFormat
  includeLogo?: boolean
  placesCount?: number
  venturesCount?: number
}): Promise<Buffer> {
  const props = buildCtaTemplateProps(input)
  return toPng(StoryCtaImage(props), input.format)
}

export async function renderMilestonePng(input: {
  format: ImageFormat
  includeLogo?: boolean
  presetTitle: string
  milestone: SocialMilestoneData
}): Promise<Buffer> {
  const props = buildMilestoneTemplateProps(input)
  return toPng(StoryMilestoneImage(props), input.format)
}
