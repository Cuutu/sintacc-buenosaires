"use client"

import { MessageCircleReply } from "lucide-react"
import { ADMIN_REPLY_DISPLAY_NAME } from "@/lib/constants"

type ReviewAdminReplyProps = {
  reply: string
  repliedAt?: string | Date
  repliedBy?: string
}

export function ReviewAdminReply({ reply, repliedAt, repliedBy }: ReviewAdminReplyProps) {
  const author = repliedBy || ADMIN_REPLY_DISPLAY_NAME
  const dateLabel = repliedAt
    ? new Date(repliedAt).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null

  return (
    <div className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
          <MessageCircleReply className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-bold text-primary">{author}</p>
            {dateLabel && (
              <p className="text-[10px] text-muted-foreground">{dateLabel}</p>
            )}
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed mt-1.5 whitespace-pre-wrap">
            {reply}
          </p>
        </div>
      </div>
    </div>
  )
}
