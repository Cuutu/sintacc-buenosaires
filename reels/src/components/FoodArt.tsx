/**
 * Ilustraciones de comida para la "foto" de las tarjetas de emprendimiento.
 * En el repo no hay fotos de emprendimientos (y no usamos marcas reales), así que
 * cada categoría tiene una ilustración plana con la paleta de marca.
 * viewBox 400x300 = el aspect-[4/3] de la foto en VentureCard.
 */
import React, {useId} from 'react';

export type ArtKind = 'pan' | 'torta' | 'vianda' | 'pizza' | 'alfajores';

/** Pseudo-aleatorio determinístico (mismo dibujo en cada frame). */
const rand = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

const BG: Record<ArtKind, string> = {
  pan: '#EBDABD',
  torta: '#F1CFBE',
  vianda: '#D5E3D2',
  pizza: '#F2E0C6',
  alfajores: '#E8D8C8',
};

const Backdrop: React.FC<{kind: ArtKind; uid: string}> = ({kind, uid}) => (
  <>
    <defs>
      <radialGradient id={`glow-${uid}`} cx="50%" cy="42%" r="65%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </radialGradient>
      <pattern id={`dots-${uid}`} width="18" height="18" patternUnits="userSpaceOnUse">
        <circle cx="9" cy="9" r="1.4" fill="#1F4D35" opacity="0.07" />
      </pattern>
      <filter id={`blur-${uid}`} x="-20%" y="-50%" width="140%" height="200%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
    </defs>
    <rect width="400" height="300" fill={BG[kind]} />
    <rect width="400" height="300" fill={`url(#dots-${uid})`} />
    <rect width="400" height="300" fill={`url(#glow-${uid})`} />
  </>
);

const Shadow: React.FC<{uid: string; cx: number; cy: number; rx: number; ry: number; o?: number}> = ({
  uid,
  cx,
  cy,
  rx,
  ry,
  o = 0.2,
}) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#4A2E18" opacity={o} filter={`url(#blur-${uid})`} />;

// —— Panificados: pan con cortes, una rodaja y un bollito ——
const Pan: React.FC<{uid: string}> = ({uid}) => {
  const r = rand(7);
  const flour = Array.from({length: 22}, () => ({
    x: 120 + r() * 170,
    y: 112 + r() * 40,
    s: 1.2 + r() * 2.2,
    o: 0.45 + r() * 0.45,
  }));
  return (
    <g>
      <Shadow uid={uid} cx={214} cy={236} rx={150} ry={16} />
      {/* Pan principal */}
      <g transform="rotate(-7 205 168)">
        <ellipse cx="205" cy="172" rx="128" ry="62" fill="#A9642E" />
        <ellipse cx="205" cy="164" rx="124" ry="56" fill="#C47E3F" />
        <ellipse cx="200" cy="150" rx="104" ry="36" fill="#D9994F" />
        <ellipse cx="190" cy="140" rx="70" ry="18" fill="#E5AE66" opacity="0.8" />
        {[
          [140, 158],
          [205, 150],
          [270, 158],
        ].map(([x, y]) => (
          <g key={x} transform={`rotate(-26 ${x} ${y})`}>
            <ellipse cx={x} cy={y + 3} rx="33" ry="10" fill="#94541F" opacity="0.55" />
            <ellipse cx={x} cy={y} rx="31" ry="8.5" fill="#F3D7A3" />
            <ellipse cx={x - 4} cy={y - 2} rx="18" ry="3.5" fill="#FBE9C6" />
          </g>
        ))}
        {flour.map((f, i) => (
          <circle key={i} cx={f.x} cy={f.y} r={f.s} fill="#FFF8EC" opacity={f.o} />
        ))}
      </g>
      {/* Rodaja */}
      <g transform="translate(46 170) rotate(-12)">
        <path d="M0 78 L0 30 C0 10 16 -2 42 -2 C68 -2 84 10 84 30 L84 78 Q42 86 0 78 Z" fill="#B8773A" />
        <path d="M8 72 L8 32 C8 16 21 7 42 7 C63 7 76 16 76 32 L76 72 Q42 78 8 72 Z" fill="#F5DFB2" />
        {[
          [26, 30, 4],
          [50, 24, 3],
          [58, 46, 4.5],
          [30, 54, 3.5],
          [44, 64, 2.5],
          [64, 62, 3],
        ].map(([x, y, s], i) => (
          <ellipse key={i} cx={x} cy={y} rx={s} ry={s * 0.7} fill="#E3C38A" />
        ))}
      </g>
      {/* Bollito */}
      <g>
        <ellipse cx="322" cy="222" rx="44" ry="30" fill="#A9642E" />
        <ellipse cx="322" cy="214" rx="42" ry="28" fill="#C47E3F" />
        <ellipse cx="316" cy="205" rx="30" ry="15" fill="#D9994F" />
        <path d="M300 210 Q322 196 344 210" stroke="#F3D7A3" strokeWidth="5" strokeLinecap="round" fill="none" />
        {[
          [306, 200],
          [318, 196],
          [331, 200],
          [312, 222],
          [336, 218],
        ].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="2.4" ry="1.4" fill="#FFF6E2" transform={`rotate(${i * 37} ${x} ${y})`} />
        ))}
      </g>
    </g>
  );
};

// —— Pastelería: porción de torta con capas, frutilla y crema ——
const Torta: React.FC<{uid: string}> = ({uid}) => {
  const T = [120, 192];
  const R = [292, 146];
  const h = 62;
  const bands: [number, number, string][] = [
    [0, 8, '#FFF3E2'],
    [8, 24, '#EDBB73'],
    [24, 31, '#A8612B'],
    [31, 47, '#EDBB73'],
    [47, 53, '#FFF3E2'],
    [53, 62, '#E2AC62'],
  ];
  const band = (a: number, b: number) =>
    `M${T[0]} ${T[1] + a} L${R[0]} ${R[1] + a} L${R[0]} ${R[1] + b} L${T[0]} ${T[1] + b} Z`;
  return (
    <g>
      <Shadow uid={uid} cx={206} cy={250} rx={160} ry={22} o={0.18} />
      {/* Plato */}
      <ellipse cx="204" cy="238" rx="160" ry="32" fill="#FDFBF7" />
      <ellipse cx="204" cy="238" rx="160" ry="32" fill="none" stroke="#E6DCCB" strokeWidth="3" />
      <ellipse cx="204" cy="236" rx="126" ry="22" fill="none" stroke="#EFE7DA" strokeWidth="2" />
      {/* Porción */}
      <Shadow uid={uid} cx={210} cy={244} rx={96} ry={10} o={0.22} />
      {bands.map(([a, b, c]) => (
        <path key={a} d={band(a, b)} fill={c} />
      ))}
      <path d={`M${R[0]} ${R[1]} C${R[0] + 9} ${R[1] + 12} ${R[0] + 10} ${R[1] + h - 12} ${R[0]} ${R[1] + h} Z`} fill="#F6E4CC" />
      {/* Cara de arriba */}
      <path d={`M${T[0]} ${T[1]} L${R[0]} ${R[1]} Q286 106 222 104 Z`} fill="#FFF3E2" />
      {/* Chorreado */}
      <path
        d={`M${T[0]} ${T[1]} L${R[0]} ${R[1]} L${R[0]} ${R[1] + 9} Q280 158 272 160 Q266 170 260 158 Q240 164 226 168 Q220 180 213 168 Q190 174 170 180 Q164 192 158 182 Q140 186 ${T[0]} ${T[1] + 8} Z`}
        fill="#FFF3E2"
      />
      {/* Crema y frutilla */}
      <ellipse cx="196" cy="146" rx="17" ry="9" fill="#FFFAF1" stroke="#EFDDC4" strokeWidth="1" />
      <ellipse cx="196" cy="138" rx="12" ry="7" fill="#FFFAF1" stroke="#EFDDC4" strokeWidth="1" />
      <ellipse cx="197" cy="131" rx="6" ry="4.5" fill="#FFFAF1" stroke="#EFDDC4" strokeWidth="1" />
      <g transform="translate(236 126) rotate(14)">
        <path d="M0 -20 C14 -20 20 -6 13 7 C9 15 3 21 0 23 C-3 21 -9 15 -13 7 C-20 -6 -14 -20 0 -20 Z" fill="#C8412F" />
        <path d="M-6 -12 C-2 -16 6 -15 8 -10" stroke="#E0705F" strokeWidth="3" strokeLinecap="round" fill="none" />
        {[
          [-6, -6],
          [5, -8],
          [-8, 4],
          [2, 2],
          [9, 3],
          [-2, 12],
          [5, 12],
        ].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="1.3" ry="2" fill="#F6D38A" />
        ))}
        <path d="M0 -20 L-9 -28 M0 -20 L0 -30 M0 -20 L9 -28" stroke="#3E7A4F" strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* Migas */}
      {[
        [96, 236],
        [110, 250],
        [312, 232],
        [326, 244],
        [300, 250],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 ? 2.4 : 3.2} fill="#E2AC62" />
      ))}
    </g>
  );
};

// —— Viandas: vianda vista de arriba (arroz, ensalada, pollo) y tenedor ——
const Vianda: React.FC<{uid: string}> = ({uid}) => {
  const r = rand(31);
  const grains = Array.from({length: 70}, () => ({
    x: 78 + r() * 98,
    y: 66 + r() * 168,
    a: r() * 180,
  }));
  const leaves = Array.from({length: 11}, (_, i) => ({
    x: 200 + r() * 96,
    y: 66 + r() * 68,
    a: r() * 180,
    c: ['#5E9A55', '#7DB36A', '#A6CF8E', '#4E8A48'][i % 4],
  }));
  return (
    <g>
      <rect x="64" y="62" width="252" height="196" rx="38" fill="#3A2A1A" opacity="0.18" filter={`url(#blur-${uid})`} />
      <rect x="62" y="50" width="252" height="196" rx="36" fill="#FDFBF7" stroke="#D5C9B6" strokeWidth="6" />
      {/* Arroz */}
      <rect x="68" y="56" width="118" height="184" rx="30" fill="#F8F1E2" />
      {grains.map((g, i) => (
        <ellipse
          key={i}
          cx={g.x}
          cy={g.y}
          rx="5"
          ry="2.2"
          fill="#FFFFFF"
          stroke="#E6DAC4"
          strokeWidth="0.9"
          transform={`rotate(${g.a} ${g.x} ${g.y})`}
        />
      ))}
      {[
        [96, 92],
        [140, 120],
        [110, 180],
        [156, 206],
        [88, 214],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#5E9A55" />
      ))}
      {/* Ensalada */}
      <rect x="192" y="56" width="116" height="86" rx="22" fill="#8DBE78" />
      {leaves.map((l, i) => (
        <ellipse key={i} cx={l.x} cy={l.y} rx="17" ry="8" fill={l.c} transform={`rotate(${l.a} ${l.x} ${l.y})`} />
      ))}
      {[
        [226, 92],
        [266, 78],
        [282, 118],
      ].map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r="12" fill="#D24A33" />
          <ellipse cx={x - 4} cy={y - 4} rx="4" ry="2.5" fill="#FFFFFF" opacity="0.55" />
          <path d={`M${x - 4} ${y - 11} L${x} ${y - 8} L${x + 4} ${y - 11}`} stroke="#3E7A4F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      ))}
      {/* Pollo grillado */}
      <rect x="192" y="150" width="116" height="90" rx="22" fill="#F2E3C8" />
      {[
        [205, 168],
        [224, 188],
        [243, 208],
      ].map(([x, y], i) => (
        <g key={i} transform={`rotate(-24 ${x + 34} ${y + 11})`}>
          <rect x={x} y={y} width="70" height="24" rx="11" fill="#D59A55" />
          <rect x={x} y={y} width="70" height="10" rx="5" fill="#E2B06C" />
          {[14, 30, 46].map((dx) => (
            <line key={dx} x1={x + dx} y1={y + 3} x2={x + dx + 8} y2={y + 21} stroke="#A0632C" strokeWidth="3" strokeLinecap="round" />
          ))}
        </g>
      ))}
      <path d="M270 232 A22 22 0 0 1 306 212 L288 222 Z" fill="#F2D06B" />
      {/* Divisores */}
      <line x1="189" y1="58" x2="189" y2="238" stroke="#D5C9B6" strokeWidth="5" strokeLinecap="round" />
      <line x1="192" y1="146" x2="308" y2="146" stroke="#D5C9B6" strokeWidth="5" strokeLinecap="round" />
      {/* Tenedor */}
      <path
        d="M338 62 h5 v40 h3 v-40 h5 v40 h3 v-40 h5 v46 c0 11 -6 17 -10 19 v110 a4.5 4.5 0 0 1 -9 0 v-110 c-4 -2 -10 -8 -10 -19 Z"
        fill="#1F4D35"
      />
    </g>
  );
};

// —— Congelados: pizza con una porción separada ——
const Pizza: React.FC<{uid: string}> = ({uid}) => {
  const cx = 192;
  const cy = 150;
  const R = 112;
  const rad = (d: number) => (d * Math.PI) / 180;
  // La porción coincide con dos cortes (0° y -45°).
  const a0 = -45;
  const a1 = 0;
  const wedge = (rr: number) =>
    `M${cx} ${cy} L${cx + rr * Math.cos(rad(a0))} ${cy + rr * Math.sin(rad(a0))} A${rr} ${rr} 0 0 1 ${cx + rr * Math.cos(rad(a1))} ${cy + rr * Math.sin(rad(a1))} Z`;
  const mid = rad((a0 + a1) / 2);
  const off = {x: Math.cos(mid) * 36, y: Math.sin(mid) * 36};
  const r = rand(53);
  const cheese = Array.from({length: 16}, () => {
    const a = r() * Math.PI * 2;
    const d = 20 + r() * 64;
    return {x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, s: 11 + r() * 12};
  });
  const olives = Array.from({length: 8}, () => {
    const a = r() * Math.PI * 2;
    const d = 18 + r() * 70;
    return {x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d};
  });
  const basil = Array.from({length: 7}, () => {
    const a = r() * Math.PI * 2;
    const d = 24 + r() * 60;
    return {x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, a: r() * 180};
  });
  const pizza = (
    <g>
      <circle cx={cx} cy={cy} r={R} fill="#E3A55C" />
      <circle cx={cx} cy={cy} r={R - 7} fill="none" stroke="#EDBB78" strokeWidth="5" />
      <circle cx={cx} cy={cy} r={R - 15} fill="#C4452C" />
      {cheese.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={c.s} fill="#F6D98F" opacity="0.96" />
      ))}
      {[
        [cx - 40, cy - 30],
        [cx + 38, cy + 34],
        [cx - 30, cy + 48],
        [cx + 58, cy - 18],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="13" fill="#D9553A" />
          <circle cx={x} cy={y} r="8" fill="#E77A5C" />
        </g>
      ))}
      {basil.map((b, i) => (
        <ellipse key={i} cx={b.x} cy={b.y} rx="11" ry="6" fill="#3E7A4F" transform={`rotate(${b.a} ${b.x} ${b.y})`} />
      ))}
      {olives.map((o, i) => (
        <g key={i}>
          <circle cx={o.x} cy={o.y} r="6.5" fill="#2F2A24" />
          <circle cx={o.x} cy={o.y} r="2.4" fill="#C4452C" />
        </g>
      ))}
      {[0, 45, 90, 135].map((d) => (
        <line
          key={d}
          x1={cx - Math.cos(rad(d)) * (R - 4)}
          y1={cy - Math.sin(rad(d)) * (R - 4)}
          x2={cx + Math.cos(rad(d)) * (R - 4)}
          y2={cy + Math.sin(rad(d)) * (R - 4)}
          stroke="#7A2A18"
          strokeOpacity="0.28"
          strokeWidth="2"
        />
      ))}
    </g>
  );
  return (
    <g>
      <defs>
        <mask id={`rest-${uid}`}>
          <rect width="400" height="300" fill="white" />
          <path d={wedge(R + 3)} fill="black" />
        </mask>
        <clipPath id={`slice-${uid}`}>
          <path d={wedge(R)} />
        </clipPath>
      </defs>
      <Shadow uid={uid} cx={cx + 6} cy={cy + 18} rx={132} ry={120} o={0.16} />
      {/* Tabla */}
      <circle cx={cx} cy={cy} r="132" fill="#D9B07E" />
      <circle cx={cx} cy={cy} r="124" fill="none" stroke="#C99C68" strokeWidth="2" />
      <path d={`M${cx - 96} ${cy - 40} Q${cx} ${cy - 70} ${cx + 96} ${cy - 40}`} stroke="#CFA473" strokeWidth="2" fill="none" />
      <path d={`M${cx - 110} ${cy + 20} Q${cx} ${cy - 6} ${cx + 110} ${cy + 20}`} stroke="#CFA473" strokeWidth="2" fill="none" />
      <g mask={`url(#rest-${uid})`}>{pizza}</g>
      {/* Hilos de queso */}
      {[
        [Math.cos(rad(-45)) * 58, Math.sin(rad(-45)) * 58],
        [74, 3],
      ].map(([x, y], i) => (
        <path
          key={i}
          d={`M${cx + x} ${cy + y} q${off.x * 0.5} ${off.y * 0.5 + 5} ${off.x} ${off.y}`}
          stroke="#F6D98F"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
      ))}
      <g transform={`translate(${off.x} ${off.y})`}>
        <path d={wedge(R)} fill="#3A2412" opacity="0.18" transform="translate(4 8)" filter={`url(#blur-${uid})`} />
        <g clipPath={`url(#slice-${uid})`}>{pizza}</g>
      </g>
    </g>
  );
};

// —— Productos artesanales: alfajores de maicena y uno de chocolate ——
const Alfajor: React.FC<{cx: number; cy: number; choco?: boolean; seed: number}> = ({cx, cy, choco, seed}) => {
  const rx = 66;
  const ry = 22;
  const side = choco ? '#4A2E22' : '#E6C68C';
  const top = choco ? '#5E3B2B' : '#F6E3B8';
  const hi = choco ? '#7B5140' : '#FBEFD2';
  const r = rand(seed);
  const coco = Array.from({length: 26}, (_, i) => ({
    x: cx - rx + 6 + i * ((2 * rx - 12) / 25) + (r() - 0.5) * 3,
    y: cy - 10 + r() * 11,
  }));
  const sugar = Array.from({length: 18}, () => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    return {x: cx + Math.cos(a) * d * (rx - 10), y: cy - 30 + Math.sin(a) * d * (ry - 6)};
  });
  return (
    <g>
      {/* galletita de abajo */}
      <ellipse cx={cx} cy={cy + 14} rx={rx} ry={ry} fill={side} />
      <rect x={cx - rx} y={cy} width={rx * 2} height={14} fill={side} />
      {!choco ? (
        <>
          {/* dulce de leche + coco */}
          <ellipse cx={cx} cy={cy + 2} rx={rx - 1} ry={ry - 1} fill="#9A5423" />
          <rect x={cx - rx + 1} y={cy - 12} width={rx * 2 - 2} height={14} fill="#B06A2E" />
          <rect x={cx - rx + 1} y={cy - 12} width={rx * 2 - 2} height={4} fill="#C98446" />
          {coco.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r="2.3" fill="#FFFDF7" />
          ))}
        </>
      ) : null}
      {/* galletita de arriba */}
      <ellipse cx={cx} cy={cy - 12} rx={rx} ry={ry} fill={side} />
      <rect x={cx - rx} y={cy - 30} width={rx * 2} height={18} fill={side} />
      <ellipse cx={cx} cy={cy - 30} rx={rx} ry={ry} fill={top} />
      <ellipse cx={cx - 12} cy={cy - 34} rx={rx - 26} ry={ry - 10} fill={hi} opacity={choco ? 0.55 : 0.8} />
      {!choco
        ? sugar.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r="1.6" fill="#FFFFFF" opacity="0.9" />)
        : null}
    </g>
  );
};

const Alfajores: React.FC<{uid: string}> = ({uid}) => (
  <g>
    <g transform="rotate(-6 200 160)">
      <rect x="62" y="68" width="276" height="196" rx="12" fill="#3A2A1A" opacity="0.14" filter={`url(#blur-${uid})`} />
      <rect x="60" y="58" width="276" height="196" rx="12" fill="#F9F2E6" />
      <rect x="60" y="58" width="276" height="196" rx="12" fill="none" stroke="#EADCC6" strokeWidth="2" />
    </g>
    <Shadow uid={uid} cx={160} cy={214} rx={74} ry={14} o={0.25} />
    <Alfajor cx={158} cy={186} seed={3} />
    <Alfajor cx={162} cy={134} seed={9} />
    <Shadow uid={uid} cx={282} cy={232} rx={70} ry={13} o={0.25} />
    <Alfajor cx={280} cy={206} choco seed={5} />
  </g>
);

const ART: Record<ArtKind, React.FC<{uid: string}>> = {
  pan: Pan,
  torta: Torta,
  vianda: Vianda,
  pizza: Pizza,
  alfajores: Alfajores,
};

type Props = {
  kind: ArtKind;
  /** Corrimiento horizontal del dibujo (px del viewBox) para dar profundidad al moverse. */
  parallax?: number;
};

export const FoodArt: React.FC<Props> = ({kind, parallax = 0}) => {
  const uid = useId().replace(/:/g, '');
  const Art = ART[kind];
  return (
    <svg viewBox="0 0 400 300" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{display: 'block'}}>
      <Backdrop kind={kind} uid={uid} />
      <g transform={`translate(${parallax} 0)`}>
        <Art uid={uid} />
      </g>
    </svg>
  );
};
