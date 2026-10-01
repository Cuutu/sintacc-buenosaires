/**
 * Port de components/home/CeliMapAtlas.tsx (la "firma visual" del hero de la web:
 * un barrio visto desde arriba). Mismos trazos; se agrega una variante oscura
 * para los fondos verdes.
 */
import React from 'react';
import {staticFile} from 'remotion';

type Tone = 'light' | 'dark';

const PAL = {
  light: {
    street: '#E8E0D0',
    block: '#BFC8BC',
    blockOpacity: 0.14,
    node: '#E8E0D0',
    wheatA: '#C85A2E',
    wheatB: '#2D4A34',
    leaf: '#2D4A34',
    icon: '#2D4A34',
  },
  dark: {
    street: 'rgba(247,243,235,0.13)',
    block: '#F7F3EB',
    blockOpacity: 0.035,
    node: 'rgba(247,243,235,0.2)',
    wheatA: '#C85A2E',
    wheatB: '#F7F3EB',
    leaf: '#F7F3EB',
    icon: '#F7F3EB',
  },
} as const;

const Wheat: React.FC<{x: number; y: number; rot?: number; scale?: number; fill: string}> = ({
  x,
  y,
  rot = 0,
  scale = 1,
  fill,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`} fill={fill}>
    <ellipse cx="0" cy="-16" rx="3" ry="5.2" />
    <ellipse cx="0" cy="-6" rx="3.2" ry="5.4" />
    <ellipse cx="0" cy="4" rx="2.9" ry="5" />
    <rect x="-0.75" y="8" width="1.5" height="16" rx="0.75" />
  </g>
);

const Leaf: React.FC<{x: number; y: number; rot?: number; scale?: number; stroke: string}> = ({
  x,
  y,
  rot = 0,
  scale = 1,
  stroke,
}) => (
  <g
    transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}
    fill="none"
    stroke={stroke}
    strokeWidth="1.15"
    strokeLinecap="round"
  >
    <path d="M0 0C7-11 16-7 0 20C-16-7-7-11 0 0Z" />
    <path d="M0 3V16" />
  </g>
);

const Pin: React.FC<{x: number; y: number; size?: number; tone: 'dedicated' | 'options'; opacity: number}> = ({
  x,
  y,
  size = 42,
  tone,
  opacity,
}) => {
  const height = size * (684 / 512);
  return (
    <image
      href={staticFile(tone === 'dedicated' ? 'map/pin-dedicated.png' : 'map/pin-options.png')}
      x={x - size / 2}
      y={y - height}
      width={size}
      height={height}
      opacity={opacity}
      preserveAspectRatio="xMidYMax meet"
    />
  );
};

const NODES = [
  [168, 148], [428, 128], [742, 148], [1048, 122], [1296, 148],
  [160, 368], [420, 352], [740, 368], [1040, 348], [1290, 368],
  [176, 588], [430, 578], [740, 588], [1050, 582], [1286, 588],
  [190, 778], [500, 768], [752, 778], [1100, 772], [1310, 778],
];

type AtlasProps = {
  tone?: Tone;
  /** Ancho del dibujo en px del video (el viewBox es 1440x900). */
  width?: number;
  x?: number;
  y?: number;
  pins?: boolean;
  pinOpacity?: number;
  opacity?: number;
};

export const Atlas: React.FC<AtlasProps> = ({
  tone = 'light',
  width = 2600,
  x = -760,
  y = 0,
  pins = true,
  pinOpacity = 0.55,
  opacity = 1,
}) => {
  const p = PAL[tone];
  const height = (width * 900) / 1440;
  return (
    <svg
      viewBox="0 0 1440 900"
      width={width}
      height={height}
      style={{position: 'absolute', left: x, top: y, opacity, pointerEvents: 'none'}}
      fill="none"
    >
      <g stroke={p.street} strokeLinecap="round" strokeLinejoin="round">
        <path d="M40 148C220 108 380 168 520 128 680 82 860 168 1020 122 1160 86 1300 148 1460 128" strokeWidth="1.5" />
        <path d="M-20 368C160 328 340 392 500 352 680 304 880 398 1060 348 1200 312 1340 372 1480 352" strokeWidth="1.5" />
        <path d="M20 588C200 548 380 628 560 578 740 528 940 638 1120 582 1260 546 1380 608 1500 588" strokeWidth="1.5" />
        <path d="M-10 778C190 738 390 818 580 768 780 712 980 828 1180 772 1300 744 1400 792 1500 778" strokeWidth="1.4" />
        <path d="M168-20C128 160 228 340 148 540C88 700 208 820 176 940" strokeWidth="1.35" />
        <path d="M428-10C388 170 478 360 408 560C348 720 468 840 438 950" strokeWidth="1.25" />
        <path d="M742-30C702 150 802 340 722 540C662 710 782 830 752 960" strokeWidth="1.2" />
        <path d="M1048-20C1008 170 1118 350 1038 560C978 720 1098 840 1068 950" strokeWidth="1.25" />
        <path d="M1296-10C1256 180 1366 360 1286 560C1226 720 1346 840 1316 940" strokeWidth="1.35" />
        <g strokeWidth="1" opacity="0.72">
          <path d="M80 248C260 218 440 278 620 238 820 192 1020 268 1220 228 1340 208 1420 248 1500 238" />
          <path d="M60 468C240 438 430 508 620 458 820 408 1040 518 1220 468 1340 444 1440 478 1520 468" />
          <path d="M100 688C280 658 480 728 680 678 880 628 1080 738 1260 688 1360 664 1440 698 1520 688" />
          <path d="M300 40C280 200 360 380 290 560C230 720 340 860 310 980" />
          <path d="M900 20C860 200 960 380 880 560C820 720 940 860 910 980" />
          <path d="M1180 30C1140 210 1240 390 1160 570C1100 730 1220 860 1190 960" />
        </g>
      </g>
      <g fill={p.block} opacity={p.blockOpacity}>
        <path d="M196 168C248 152 318 158 352 178C368 228 352 268 318 286C248 298 196 278 176 238C168 208 176 182 196 168Z" />
        <path d="M1088 142C1148 128 1228 148 1262 178C1278 228 1252 278 1198 292C1128 298 1072 268 1058 218C1052 188 1064 158 1088 142Z" />
        <path d="M196 612C258 592 338 608 372 638C388 688 362 738 308 752C238 758 182 728 168 678C162 648 174 622 196 612Z" />
        <path d="M1108 632C1168 618 1248 638 1282 668C1298 718 1272 768 1218 782C1148 788 1092 758 1078 708C1072 678 1084 648 1108 632Z" />
        <path d="M468 412C528 398 598 418 628 448C638 488 612 528 562 542C492 548 448 518 438 478C432 448 444 422 468 412Z" />
      </g>
      <g fill={p.node}>
        {NODES.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.1" />
        ))}
      </g>
      <g opacity="0.28">
        <Wheat x={96} y={96} rot={-28} scale={1.15} fill={p.wheatA} />
        <Wheat x={132} y={118} rot={-8} scale={0.85} fill={p.wheatA} />
        <Wheat x={78} y={128} rot={-42} scale={0.72} fill={p.wheatA} />
        <Wheat x={1320} y={780} rot={22} scale={1.1} fill={p.wheatA} />
        <Wheat x={1284} y={808} rot={38} scale={0.8} fill={p.wheatA} />
        <Wheat x={1352} y={806} rot={8} scale={0.7} fill={p.wheatA} />
        <Wheat x={118} y={820} rot={-18} scale={0.75} fill={p.wheatB} />
        <Wheat x={1340} y={88} rot={16} scale={0.7} fill={p.wheatB} />
      </g>
      <g opacity="0.22">
        <Leaf x={88} y={520} rot={-24} stroke={p.leaf} />
        <Leaf x={118} y={548} rot={12} scale={0.85} stroke={p.leaf} />
        <Leaf x={70} y={560} rot={-48} scale={0.7} stroke={p.leaf} />
        <Leaf x={1360} y={420} rot={18} stroke={p.leaf} />
        <Leaf x={1332} y={448} rot={-12} scale={0.8} stroke={p.leaf} />
        <Leaf x={1382} y={452} rot={32} scale={0.68} stroke={p.leaf} />
        <Leaf x={980} y={70} rot={8} scale={0.75} stroke={p.leaf} />
        <Leaf x={420} y={830} rot={-16} scale={0.8} stroke={p.leaf} />
      </g>
      {pins ? (
        <g>
          <Pin x={428} y={128} tone="dedicated" opacity={pinOpacity} />
          <Pin x={1048} y={122} tone="options" opacity={pinOpacity} />
          <Pin x={176} y={588} tone="dedicated" opacity={pinOpacity} />
          <Pin x={1286} y={588} tone="options" opacity={pinOpacity} />
          <Pin x={752} y={778} size={34} tone="dedicated" opacity={pinOpacity} />
          <Pin x={1290} y={368} size={34} tone="options" opacity={pinOpacity} />
        </g>
      ) : null}
    </svg>
  );
};
