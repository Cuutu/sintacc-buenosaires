/**
 * Pantalla /mapa en mobile, en px lógicos (390x818) para ir dentro de <Phone>.
 * Recrea MapTopBar (buscador + chips "100% sin TACC" / "Tiene opciones" + leyenda),
 * los pines de lib/celimap-pin, PlaceMiniCard y la BottomNav.
 *
 * El mapa es una ilustración (no Mapbox) y los lugares son genéricos.
 */
import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ChevronDown, Heart, Search, SlidersHorizontal, Store} from 'lucide-react';
import {clamp, colors, easeInOut, fonts} from '../brand';
import {BottomNav} from '../components/BottomNav';
import {Finger} from '../components/Finger';
import {SCREEN_H, SCREEN_W} from '../components/Phone';
import {lugarEjemplo} from './copy';
import type {Timing} from './timing';

type MapT = Timing['mapa'];

type PinDef = {x: number; y: number; tone: 'dedicated' | 'options'};

/** El pin 0 es el que se toca. */
const PINS: PinDef[] = [
  {x: 236, y: 452, tone: 'dedicated'},
  {x: 120, y: 330, tone: 'options'},
  {x: 300, y: 300, tone: 'dedicated'},
  {x: 70, y: 470, tone: 'dedicated'},
  {x: 178, y: 560, tone: 'options'},
  {x: 330, y: 540, tone: 'options'},
  {x: 210, y: 360, tone: 'options'},
  {x: 92, y: 610, tone: 'options'},
  {x: 322, y: 402, tone: 'dedicated'},
  {x: 140, y: 420, tone: 'options'},
  {x: 270, y: 640, tone: 'dedicated'},
  {x: 40, y: 360, tone: 'options'},
];

const USER = {x: 196, y: 498};

const CHIP_DEDICATED = {x: 74, y: 152};

export const MapScreen: React.FC<{t: MapT}> = ({t: MAP}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const filterOn = interpolate(frame, [MAP.filterTap, MAP.filterTap + 8], [0, 1], {...clamp, easing: easeInOut});
  const cardIn = spring({frame: frame - MAP.card, fps, config: {damping: 16, mass: 0.7}});
  const selected = spring({frame: frame - MAP.pinTap, fps, config: {damping: 9, mass: 0.5}});
  const pulse = (frame % 40) / 40;

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#FBF8F1'}}>
      <MapArt />

      {/* Mi ubicación */}
      <div style={{position: 'absolute', left: USER.x, top: USER.y}}>
        <div
          style={{
            position: 'absolute',
            left: -10 - pulse * 22,
            top: -10 - pulse * 22,
            width: 20 + pulse * 44,
            height: 20 + pulse * 44,
            borderRadius: 999,
            background: 'rgba(31,77,53,0.18)',
            opacity: 1 - pulse,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: -9,
            top: -9,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: colors.verde,
            border: '3px solid #FFFFFF',
            boxShadow: '0 2px 6px rgba(31,77,53,0.35)',
          }}
        />
      </div>

      {/* Pines */}
      {PINS.map((pin, i) => {
        const p = spring({frame: frame - MAP.pins - i * MAP.pinStagger, fps, config: {damping: 11, mass: 0.6}});
        const dim = pin.tone === 'options' ? filterOn : 0;
        const sel = i === 0 ? selected : 0;
        const w = 30 * (1 + sel * 0.35) * (1 - dim * 0.25);
        const h = w * (684 / 512);
        return (
          <Img
            key={i}
            src={staticFile(pin.tone === 'dedicated' ? 'map/pin-dedicated.png' : 'map/pin-options.png')}
            style={{
              position: 'absolute',
              left: pin.x - w / 2,
              top: pin.y - h,
              width: w,
              height: h,
              opacity: Math.min(1, p * 2) * (1 - dim * 0.82),
              transform: `translateY(${(1 - p) * -60}px)`,
              filter: 'drop-shadow(0 4px 4px rgba(31,77,53,0.28))',
              zIndex: i === 0 ? 2 : 1,
            }}
          />
        );
      })}

      <TopBar filterOn={filterOn} filterTap={MAP.filterTap} />

      {/* PlaceMiniCard seleccionada */}
      <div
        style={{
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: 94,
          transform: `translateY(${(1 - cardIn) * 220}px)`,
          opacity: Math.min(1, cardIn * 2),
          zIndex: 7,
        }}
      >
        <MiniCard />
      </div>

      <BottomNav active="mapa" />

      <Finger
        appear={MAP.fingerIn}
        disappear={MAP.fingerOut}
        taps={[MAP.filterTap, MAP.pinTap]}
        keys={[
          {f: MAP.fingerIn, x: 200, y: 330},
          {f: MAP.filterTap - 2, x: CHIP_DEDICATED.x, y: CHIP_DEDICATED.y},
          {f: MAP.filterTap + 10, x: CHIP_DEDICATED.x, y: CHIP_DEDICATED.y},
          {f: MAP.pinTap - 2, x: PINS[0].x, y: PINS[0].y - 22},
          {f: MAP.fingerOut, x: PINS[0].x + 10, y: PINS[0].y + 20},
        ]}
      />
    </div>
  );
};

/** Buscador + chips + leyenda, como la "map-chrome" de MapTopBar en mobile. */
const TopBar: React.FC<{filterOn: number; filterTap: number}> = ({filterOn, filterTap}) => {
  const frame = useCurrentFrame();
  const press = frame >= filterTap - 2 && frame <= filterTap + 3 ? 0.94 : 1;
  const mix = (a: string, b: string) => (filterOn > 0.5 ? b : a);
  return (
    <div
      style={{
        position: 'absolute',
        left: 8,
        right: 8,
        top: 56,
        borderRadius: 32,
        background: 'rgba(253,251,247,0.97)',
        border: '1px solid rgba(31,77,53,0.08)',
        boxShadow: '0 10px 30px -14px rgba(31,77,53,0.3)',
        padding: '6px 10px 10px',
        zIndex: 6,
        fontFamily: fonts.sans,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', height: 44, gap: 8, padding: '0 4px 0 10px'}}>
        <Search size={18} color="rgba(95,107,99,0.8)" strokeWidth={2} />
        <span style={{flex: 1, fontSize: 16, color: 'rgba(95,107,99,0.7)', fontWeight: 500}}>Buscar lugar o zona...</span>
        <SlidersHorizontal size={19} color="rgba(31,77,53,0.7)" strokeWidth={2} />
      </div>
      <div style={{display: 'flex', gap: 6, marginTop: 4}}>
        <span
          style={{
            ...chip,
            borderColor: mix('rgba(31,77,53,0.16)', colors.verde),
            background: mix('#FDFBF7', colors.verde),
            color: mix(colors.verde, colors.crema),
            transform: `scale(${press})`,
          }}
        >
          100% sin TACC
        </span>
        <span style={{...chip, borderColor: 'rgba(31,77,53,0.16)', background: '#FDFBF7', color: colors.verde}}>Tiene opciones</span>
        <span style={{...chip, borderColor: 'rgba(31,77,53,0.16)', background: '#FDFBF7', color: colors.verde, display: 'inline-flex', alignItems: 'center', gap: 2}}>
          Tipo de lugar <ChevronDown size={14} strokeWidth={2.2} />
        </span>
      </div>
      <div style={{display: 'flex', gap: 14, marginTop: 9, paddingLeft: 4}}>
        {[
          {c: '#1F4D35', l: '100% sin TACC'},
          {c: '#C85A2E', l: 'Tiene opciones'},
          {c: '#CFC9BF', l: 'Sin información'},
        ].map((it) => (
          <span key={it.l} style={{display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 500, color: 'rgba(31,77,53,0.65)'}}>
            <span style={{width: 7, height: 7, borderRadius: 99, background: it.c}} />
            {it.l}
          </span>
        ))}
      </div>
    </div>
  );
};

const chip: React.CSSProperties = {
  minHeight: 34,
  borderRadius: 999,
  border: '1px solid',
  padding: '7px 12px',
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '0.01em',
  whiteSpace: 'nowrap',
  lineHeight: '18px',
};

/** PlaceMiniCard (components/map-view/PlaceMiniCard.tsx), estado seleccionado. */
const MiniCard: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      borderRadius: 20,
      border: '1px solid rgba(31,77,53,0.22)',
      background: '#FFFEFB',
      padding: 12,
      boxShadow: '0 14px 30px -14px rgba(31,77,53,0.4)',
      fontFamily: fonts.sans,
    }}
  >
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 12,
        background: 'linear-gradient(135deg, #E9C9A3 0%, #D9A673 55%, #C98A55 100%)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Store size={24} color="rgba(255,253,248,0.9)" strokeWidth={1.85} />
    </div>
    <div style={{flex: 1, minWidth: 0}}>
      <div style={{fontSize: 15, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.015em', color: colors.verde}}>
        {lugarEjemplo.nombre}
      </div>
      <div style={{fontSize: 12.5, fontWeight: 500, color: colors.muted, marginTop: 2}}>{lugarEjemplo.meta.join(' · ')}</div>
      <div style={{marginTop: 8}}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            borderRadius: 999,
            border: '1px solid rgba(31,77,53,0.2)',
            background: 'rgba(31,77,53,0.1)',
            padding: '3px 8px',
            fontSize: 10.5,
            fontWeight: 700,
            color: colors.verde,
          }}
        >
          <span style={{width: 6, height: 6, borderRadius: 99, background: colors.verde}} />
          100% sin TACC
        </span>
      </div>
    </div>
    <Heart size={20} color={colors.verde} strokeWidth={1.9} style={{marginTop: 4}} />
  </div>
);

/** Mapa ilustrado: manzanas crema, avenidas, plazas y un borde de río. */
const MapArt: React.FC = () => {
  const blocks: React.ReactNode[] = [];
  const cell = 64;
  const gap = 9;
  const parks = new Set(['3-4', '6-1', '1-8', '5-9']);
  for (let r = -3; r < 16; r++) {
    for (let c = -3; c < 10; c++) {
      const avenueGapX = c % 4 === 0 ? 8 : 0;
      const avenueGapY = r % 5 === 0 ? 8 : 0;
      const key = `${c}-${r}`;
      blocks.push(
        <rect
          key={key}
          x={c * cell + gap / 2 + avenueGapX}
          y={r * cell + gap / 2 + avenueGapY}
          width={cell - gap - avenueGapX}
          height={cell - gap - avenueGapY}
          rx={7}
          fill={parks.has(key) ? '#D5E1C6' : '#EEE7D9'}
        />,
      );
    }
  }
  return (
    <svg width={SCREEN_W} height={SCREEN_H} style={{position: 'absolute', inset: 0}}>
      <rect width={SCREEN_W} height={SCREEN_H} fill="#FBF8F1" />
      <g transform={`rotate(-14 ${SCREEN_W / 2} ${SCREEN_H / 2})`}>{blocks}</g>
      {/* Diagonal tipo avenida */}
      <path d="M-40 760 C 120 640, 260 560, 460 300" stroke="#FFFDF8" strokeWidth={15} fill="none" />
      <path d="M-40 760 C 120 640, 260 560, 460 300" stroke="#F0D9B8" strokeWidth={4} fill="none" opacity={0.7} />
      {/* Río */}
      <path d={`M ${SCREEN_W} 150 C 350 230, 372 330, 352 420 S 372 600, ${SCREEN_W} 700 Z`} fill="#D6E2E0" />
    </svg>
  );
};

