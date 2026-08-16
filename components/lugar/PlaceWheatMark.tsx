export function PlaceWheatMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 160"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M60 148V28"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M60 36c-10-8-22-10-28-8 2 10 12 18 28 22 16-4 26-12 28-22-6-2-18 0-28 8Z"
        fill="currentColor"
        opacity="0.88"
      />
      <path
        d="M60 58c-12-7-26-8-32-5 3 11 14 18 32 21 18-3 29-10 32-21-6-3-20-2-32 5Z"
        fill="currentColor"
        opacity="0.72"
      />
      <path
        d="M60 80c-13-6-27-6-33-2 4 11 15 17 33 19 18-2 29-8 33-19-6-4-20-4-33 2Z"
        fill="currentColor"
        opacity="0.58"
      />
      <path
        d="M60 102c-12-5-24-4-30 0 4 10 14 15 30 16 16-1 26-6 30-16-6-4-18-5-30 0Z"
        fill="currentColor"
        opacity="0.42"
      />
    </svg>
  )
}
