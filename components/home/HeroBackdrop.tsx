export function HeroBackdrop() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.09] text-olive"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <path
          d="M80 520C180 480 240 400 340 390C460 378 520 470 640 450C760 430 820 320 940 310C1040 302 1120 360 1180 340"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M40 280C140 300 210 240 320 250C450 262 500 340 630 330C760 320 810 210 940 200C1040 192 1120 240 1200 220"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M0 640C120 610 200 680 320 660C460 636 530 560 660 570C790 580 850 670 980 650"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <circle cx="340" cy="390" r="5" fill="currentColor" />
        <circle cx="640" cy="450" r="4" fill="currentColor" />
        <circle cx="940" cy="310" r="6" fill="#D4633A" fillOpacity="0.85" />
        <circle cx="320" cy="250" r="4" fill="currentColor" />
        <circle cx="630" cy="330" r="5" fill="currentColor" />
        <circle cx="660" cy="570" r="4" fill="currentColor" />
      </svg>
      <div className="absolute -top-24 right-[-8%] h-[28rem] w-[28rem] rounded-full bg-olive/8 blur-[90px]" />
      <div className="absolute bottom-[-12%] left-[-6%] h-[22rem] w-[22rem] rounded-full bg-terracotta/10 blur-[80px]" />
      <div className="celimap-hero-noise" />
    </div>
  )
}
