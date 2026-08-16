import type { CSSProperties } from "react"

/** Firma visual CeliMap: barrio visto desde arriba. viewBox 1440×900. */

export const ATLAS_VIEWBOX = "0 0 1440 900"

function Wheat({
  x,
  y,
  rot = 0,
  scale = 1,
  fill = "#C85A2E",
}: {
  x: number
  y: number
  rot?: number
  scale?: number
  fill?: string
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`} fill={fill}>
      <ellipse cx="0" cy="-16" rx="3" ry="5.2" />
      <ellipse cx="0" cy="-6" rx="3.2" ry="5.4" />
      <ellipse cx="0" cy="4" rx="2.9" ry="5" />
      <rect x="-0.75" y="8" width="1.5" height="16" rx="0.75" />
    </g>
  )
}

function Leaf({
  x,
  y,
  rot = 0,
  scale = 1,
}: {
  x: number
  y: number
  rot?: number
  scale?: number
}) {
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}
      fill="none"
      stroke="#2D4A34"
      strokeWidth="1.15"
      strokeLinecap="round"
    >
      <path d="M0 0C7-11 16-7 0 20C-16-7-7-11 0 0Z" />
      <path d="M0 3V16" />
    </g>
  )
}

function Pin({ x, y, scale = 0.22 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M0-92C-36-92-62-62-62-26c0 52 62 118 62 118s62-66 62-118C62-62 36-92 0-92Z"
        fill="#2D4A34"
      />
      <ellipse cx="0" cy="-54" rx="5.5" ry="8" fill="#C85A2E" />
      <ellipse cx="-9" cy="-42" rx="5" ry="7.5" fill="#F6F1E8" />
      <ellipse cx="9" cy="-42" rx="5" ry="7.5" fill="#F6F1E8" />
      <ellipse cx="-9" cy="-26" rx="5" ry="7.5" fill="#F6F1E8" />
      <ellipse cx="9" cy="-26" rx="5" ry="7.5" fill="#F6F1E8" />
      <ellipse cx="-9" cy="-10" rx="4.6" ry="7" fill="#F6F1E8" />
      <ellipse cx="9" cy="-10" rx="4.6" ry="7" fill="#F6F1E8" />
      <rect x="-1.6" y="-4" width="3.2" height="22" rx="1.6" fill="#F6F1E8" />
    </g>
  )
}

function IconCafe({ x, y }: { x: number; y: number }) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      fill="none"
      stroke="#2D4A34"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M-7 3h10a5 5 0 0 0 0-10H-7c-1.4 0-2.5 1.2-2.5 2.6v4.8C-9.5 1.8-8.4 3-7 3Z" />
      <path d="M-4-12c.4-2 1.6-3 2.4-4M0-12c.4-2 1.6-3 2.4-4" />
    </g>
  )
}

function IconBakery({ x, y }: { x: number; y: number }) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      fill="none"
      stroke="#2D4A34"
      strokeWidth="1.2"
      strokeLinecap="round"
    >
      <path d="M-9 2C-9-6 9-6 9 2c0 4.5-4 7-9 7s-9-2.5-9-7Z" />
      <path d="M-3-3.5  -1.2 1M2-3.5l1.8 4.5" />
    </g>
  )
}

function IconRestaurant({ x, y }: { x: number; y: number }) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      fill="none"
      stroke="#2D4A34"
      strokeWidth="1.2"
      strokeLinecap="round"
    >
      <circle cx="0" cy="0" r="8" />
      <circle cx="0" cy="0" r="3.2" />
    </g>
  )
}

function IconStore({ x, y }: { x: number; y: number }) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      fill="none"
      stroke="#2D4A34"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M-8 6V0L0-8l8 8v6" />
      <path d="M-5 6V2h10v4" />
    </g>
  )
}

const SVG_PROPS = {
  viewBox: ATLAS_VIEWBOX,
  preserveAspectRatio: "xMidYMid slice" as const,
  fill: "none",
  "aria-hidden": true as const,
}

/** Calles y manzanas — capa lejana. */
export function AtlasStreets({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg {...SVG_PROPS} className={className} style={style}>
      <g stroke="#D9DED4" strokeLinecap="round" strokeLinejoin="round">
        {/* Avenidas */}
        <path
          d="M40 148C220 108 380 168 520 128 680 82 860 168 1020 122 1160 86 1300 148 1460 128"
          strokeWidth="1.5"
        />
        <path
          d="M-20 368C160 328 340 392 500 352 680 304 880 398 1060 348 1200 312 1340 372 1480 352"
          strokeWidth="1.5"
        />
        <path
          d="M20 588C200 548 380 628 560 578 740 528 940 638 1120 582 1260 546 1380 608 1500 588"
          strokeWidth="1.5"
        />
        <path
          d="M-10 778C190 738 390 818 580 768 780 712 980 828 1180 772 1300 744 1400 792 1500 778"
          strokeWidth="1.4"
        />

        {/* Calles verticales orgánicas */}
        <path d="M168-20C128 160 228 340 148 540C88 700 208 820 176 940" strokeWidth="1.35" />
        <path d="M428-10C388 170 478 360 408 560C348 720 468 840 438 950" strokeWidth="1.25" />
        <path d="M742-30C702 150 802 340 722 540C662 710 782 830 752 960" strokeWidth="1.2" />
        <path d="M1048-20C1008 170 1118 350 1038 560C978 720 1098 840 1068 950" strokeWidth="1.25" />
        <path d="M1296-10C1256 180 1366 360 1286 560C1226 720 1346 840 1316 940" strokeWidth="1.35" />

        {/* Calles menores */}
        <g strokeWidth="1" opacity="0.72">
          <path d="M80 248C260 218 440 278 620 238 820 192 1020 268 1220 228 1340 208 1420 248 1500 238" />
          <path d="M60 468C240 438 430 508 620 458 820 408 1040 518 1220 468 1340 444 1440 478 1520 468" />
          <path d="M100 688C280 658 480 728 680 678 880 628 1080 738 1260 688 1360 664 1440 698 1520 688" />
          <path d="M300 40C280 200 360 380 290 560C230 720 340 860 310 980" />
          <path d="M900 20C860 200 960 380 880 560C820 720 940 860 910 980" />
          <path d="M1180 30C1140 210 1240 390 1160 570C1100 730 1220 860 1190 960" />
        </g>
      </g>

      {/* Manzanas — huellas suaves */}
      <g fill="#BFC8BC" opacity="0.14">
        <path d="M196 168C248 152 318 158 352 178C368 228 352 268 318 286C248 298 196 278 176 238C168 208 176 182 196 168Z" />
        <path d="M1088 142C1148 128 1228 148 1262 178C1278 228 1252 278 1198 292C1128 298 1072 268 1058 218C1052 188 1064 158 1088 142Z" />
        <path d="M196 612C258 592 338 608 372 638C388 688 362 738 308 752C238 758 182 728 168 678C162 648 174 622 196 612Z" />
        <path d="M1108 632C1168 618 1248 638 1282 668C1298 718 1272 768 1218 782C1148 788 1092 758 1078 708C1072 678 1084 648 1108 632Z" />
        <path d="M468 412C528 398 598 418 628 448C638 488 612 528 562 542C492 548 448 518 438 478C432 448 444 422 468 412Z" />
      </g>

      {/* Nodos de cruce */}
      <g fill="#BFC8BC">
        {[
          [168, 148],
          [428, 128],
          [742, 148],
          [1048, 122],
          [1296, 148],
          [160, 368],
          [420, 352],
          [740, 368],
          [1040, 348],
          [1290, 368],
          [176, 588],
          [430, 578],
          [740, 588],
          [1050, 582],
          [1286, 588],
          [190, 778],
          [500, 768],
          [752, 778],
          [1100, 772],
          [1310, 778],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.1" />
        ))}
      </g>
    </svg>
  )
}

/** Espigas, hojas y vínculos — capa media. */
export function AtlasFlora({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg {...SVG_PROPS} className={className} style={style}>
      <g opacity="0.32" stroke="#2D4A34" strokeWidth="1.15" strokeLinecap="round" fill="none">
        <path d="M428 128C520 210 620 250 740 368" strokeDasharray="3 7" />
        <path d="M1048 122C980 220 880 280 740 368" strokeDasharray="3 7" />
        <path d="M176 588C320 520 520 460 740 368" strokeDasharray="3 7" />
        <path d="M1286 588C1100 500 920 430 740 368" strokeDasharray="3 7" />
        <path d="M752 778C740 620 740 500 740 368" strokeDasharray="3 7" />
      </g>

      <g opacity="0.28">
        <Wheat x={96} y={96} rot={-28} scale={1.15} />
        <Wheat x={132} y={118} rot={-8} scale={0.85} />
        <Wheat x={78} y={128} rot={-42} scale={0.72} />
        <Wheat x={1320} y={780} rot={22} scale={1.1} />
        <Wheat x={1284} y={808} rot={38} scale={0.8} />
        <Wheat x={1352} y={806} rot={8} scale={0.7} />
        <Wheat x={118} y={820} rot={-18} fill="#2D4A34" scale={0.75} />
        <Wheat x={1340} y={88} rot={16} fill="#2D4A34" scale={0.7} />
      </g>

      <g opacity="0.22">
        <Leaf x={88} y={520} rot={-24} />
        <Leaf x={118} y={548} rot={12} scale={0.85} />
        <Leaf x={70} y={560} rot={-48} scale={0.7} />
        <Leaf x={1360} y={420} rot={18} />
        <Leaf x={1332} y={448} rot={-12} scale={0.8} />
        <Leaf x={1382} y={452} rot={32} scale={0.68} />
        <Leaf x={980} y={70} rot={8} scale={0.75} />
        <Leaf x={420} y={830} rot={-16} scale={0.8} />
      </g>
    </svg>
  )
}

/** Pins e íconos de lugar — capa cercana. */
export function AtlasPlaces({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg {...SVG_PROPS} className={className} style={style}>
      <g opacity="0.38">
        <Pin x={428} y={128} />
        <Pin x={1048} y={122} />
        <Pin x={176} y={588} />
        <Pin x={1286} y={588} />
        <Pin x={752} y={778} scale={0.2} />
        <Pin x={1290} y={368} scale={0.2} />
      </g>
      <g opacity="0.26">
        <IconCafe x={458} y={96} />
        <IconBakery x={1078} y={90} />
        <IconRestaurant x={206} y={556} />
        <IconStore x={1316} y={556} />
        <IconCafe x={782} y={748} />
        <IconBakery x={1320} y={336} />
      </g>
    </svg>
  )
}
