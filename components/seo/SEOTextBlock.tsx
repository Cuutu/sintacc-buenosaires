interface SEOTextBlockProps {
  content: string
  className?: string
}

function renderBlock(line: string, key: number) {
  if (line.startsWith("# ")) {
    return <h2 key={key} className="text-xl font-semibold mt-6 mb-2">{line.slice(2)}</h2>
  }
  if (line.startsWith("## ")) {
    return <h3 key={key} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h3>
  }
  if (line.trim()) {
    return <p key={key} className="mb-3 text-muted-foreground">{line}</p>
  }
  return null
}

export function SEOTextBlock({ content, className = "" }: SEOTextBlockProps) {
  const blocks = content.split("\n\n").map((block, i) => {
    const lines = block.split("\n")
    return lines.map((line, j) => renderBlock(line, i * 100 + j))
  }).flat().filter(Boolean)

  return (
    <article className={`max-w-none ${className}`}>
      {blocks}
    </article>
  )
}
