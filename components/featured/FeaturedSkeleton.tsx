"use client"

export function FeaturedSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-olive/10 bg-olive/5 backdrop-blur-md animate-pulse">
      <div className="aspect-[4/3] w-full shrink-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent" />
      <div className="flex flex-1 flex-col p-4 pt-3">
        <div className="mb-1 min-h-[2.75rem] space-y-2">
          <div className="h-5 w-3/4 rounded bg-olive/10" />
          <div className="h-5 w-1/2 rounded bg-olive/10" />
        </div>
        <div className="h-4 w-1/2 rounded bg-olive/10" />
        <div className="mt-3 h-5 w-24 rounded bg-olive/10" />
        <div className="mt-auto flex min-h-[2.5rem] gap-2 pt-3">
          <div className="h-6 w-16 rounded-full bg-olive/10" />
          <div className="h-6 w-20 rounded-full bg-olive/10" />
        </div>
      </div>
    </div>
  )
}
