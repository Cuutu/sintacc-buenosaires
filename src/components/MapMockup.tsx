import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {PinMarker} from './PinMarker';
import {colors, ease, fonts, springConfig} from '../tokens';

const typeConfig = {
  restaurant: {icon: '🍽️', color: '#ea580c', label: 'Restaurante'},
  cafe: {icon: '☕', color: '#78350f', label: 'Café'},
  bakery: {icon: '🥐', color: '#ca8a04', label: 'Panadería'},
  store: {icon: '🛒', color: '#16a34a', label: 'Tienda'},
  other: {icon: '📍', color: '#3b82f6', label: 'Lugar'},
} as const;

const realPlaces = [
  {
    name: 'La Unión gluten free',
    neighborhood: 'Parque Chas',
    type: 'cafe',
    safety: '100% sin TACC',
    x: 352,
    y: 365,
  },
  {
    name: 'Cata sin gluten',
    neighborhood: 'Villa Urquiza',
    type: 'bakery',
    safety: '100% sin TACC',
    x: 286,
    y: 300,
  },
  {
    name: 'Polvorín',
    neighborhood: 'Parque Chacabuco',
    type: 'cafe',
    safety: 'Opciones sin TACC',
    x: 552,
    y: 782,
  },
  {
    name: 'Havanna',
    neighborhood: 'San Telmo',
    type: 'other',
    safety: 'Opciones sin TACC',
    x: 690,
    y: 880,
  },
  {
    name: 'Infinita Cocina Caballito',
    neighborhood: 'Caballito',
    type: 'bakery',
    safety: 'Opciones sin TACC',
    x: 492,
    y: 692,
  },
  {
    name: 'Más Dulce y Casero',
    neighborhood: 'Constitución',
    type: 'bakery',
    safety: 'Opciones sin TACC',
    x: 730,
    y: 785,
  },
  {
    name: 'Malvis gluten free',
    neighborhood: 'Campana',
    type: 'cafe',
    safety: '100% sin TACC',
    x: 200,
    y: 1015,
  },
  {
    name: 'Goutacc',
    neighborhood: 'Campana',
    type: 'bakery',
    safety: '100% sin TACC',
    x: 275,
    y: 1110,
  },
] as const;

export const MapMockup: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: springConfig});
  const cardIn = spring({frame: frame - 54, fps, config: springConfig});
  const count = Math.round(
    interpolate(frame, [18, 126], [0, 400], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: ease,
    }),
  );
  const selected = realPlaces[0];
  const selectedType = typeConfig[selected.type];

  return (
    <div
      style={{
        position: 'absolute',
        left: 48,
        right: 48,
        top: 110,
        height: 1550,
        borderRadius: 42,
        overflow: 'hidden',
        border: `1px solid ${colors.line}`,
        background: '#0f172a',
        boxShadow: '0 36px 110px rgba(0, 0, 0, 0.44)',
        transform: `translateY(${interpolate(enter, [0, 1], [650, 0])}px)`,
      }}
    >
      <MapCanvas frame={frame} />

      <div
        style={{
          position: 'absolute',
          top: 30,
          left: 30,
          right: 30,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          zIndex: 4,
        }}
      >
        <div
          style={{
            height: 78,
            borderRadius: 999,
            background: 'rgba(11, 18, 32, 0.86)',
            border: `1px solid ${colors.line}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 26px',
            color: colors.textOnDark,
            fontFamily: fonts.body,
            fontSize: 27,
            fontWeight: 800,
            boxShadow: '0 18px 40px rgba(0,0,0,0.25)',
          }}
        >
          Buscar por barrio, ciudad o local
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{display: 'flex', gap: 10, flexWrap: 'wrap', maxWidth: 600}}>
            {['✅ 100% sin TACC', '🟡 Tiene opciones', '🍳 Cocina separada'].map((chip, index) => {
              const chipIn = spring({
                frame: frame - 24 - index * 6,
                fps,
                config: springConfig,
              });
              return (
                <div
                  key={chip}
                  style={{
                    padding: '11px 15px',
                    borderRadius: 999,
                    color: colors.textOnDark,
                    background: 'rgba(11, 18, 32, 0.78)',
                    border: `1px solid ${colors.line}`,
                    fontFamily: fonts.body,
                    fontSize: 21,
                    fontWeight: 800,
                    opacity: chipIn,
                    transform: `translateY(${interpolate(chipIn, [0, 1], [-24, 0])}px)`,
                  }}
                >
                  {chip}
                </div>
              );
            })}
          </div>
          <div
            style={{
              padding: '15px 20px',
              borderRadius: 8,
              background: colors.cream,
              color: colors.backgroundDark,
              fontFamily: fonts.mono,
              fontSize: 28,
              fontWeight: 900,
              boxShadow: '0 18px 44px rgba(0, 0, 0, 0.26)',
            }}
          >
            +{count} lugares
          </div>
        </div>
      </div>

      {realPlaces.map((place, index) => {
        const config = typeConfig[place.type];
        return (
          <PinMarker
            key={place.name}
            x={place.x}
            y={place.y}
            delay={22 + index * 5}
            active={index === 0}
            size={index === 0 ? 58 : 45}
            color={config.color}
            icon={config.icon}
          />
        );
      })}

      <div
        style={{
          position: 'absolute',
          left: 92,
          top: 415,
          width: 650,
          padding: '28px 30px',
          borderRadius: 10,
          background: '#13161f',
          border: '1.5px solid #2e3448',
          boxShadow: '0 28px 80px rgba(0, 0, 0, 0.46)',
          opacity: interpolate(cardIn, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(cardIn, [0, 1], [42, 0])}px) scale(${interpolate(cardIn, [0, 1], [0.92, 1])})`,
          zIndex: 5,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: 999,
              background: selectedType.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              border: `3px solid ${colors.cream}`,
            }}
          >
            {selectedType.icon}
          </div>
          <div>
            <div
              style={{
                color: colors.textOnDark,
                fontFamily: fonts.heading,
                fontSize: 44,
                fontStyle: 'italic',
                lineHeight: 1.02,
              }}
            >
              {selected.name}
            </div>
            <div
              style={{
                marginTop: 4,
                color: 'rgba(232, 228, 220, 0.62)',
                fontFamily: fonts.body,
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {selected.neighborhood}
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 22,
            alignItems: 'center',
          }}
        >
          <span
            style={{
              color: '#4ade80',
              fontFamily: fonts.body,
              fontSize: 22,
              fontWeight: 900,
              background: 'rgba(74,222,128,0.12)',
              border: '1px solid rgba(74,222,128,0.3)',
              padding: '9px 12px',
              borderRadius: 8,
            }}
          >
            ✅ {selected.safety}
          </span>
          <span
            style={{
              color: colors.cream,
              fontFamily: fonts.body,
              fontSize: 22,
              fontWeight: 800,
              background: colors.forest,
              padding: '10px 15px',
              borderRadius: 8,
            }}
          >
            Ver detalle →
          </span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 390,
          background: 'rgba(11, 18, 32, 0.92)',
          borderTop: `1px solid ${colors.line}`,
          padding: '26px 30px',
          zIndex: 4,
        }}
      >
        <div
          style={{
            width: 86,
            height: 6,
            borderRadius: 999,
            background: 'rgba(245,240,232,0.28)',
            margin: '0 auto 22px',
          }}
        />
        <div
          style={{
            color: colors.textOnDark,
            fontFamily: fonts.body,
            fontSize: 25,
            fontWeight: 900,
            marginBottom: 16,
          }}
        >
          Locales reales cargados en Celimap
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
          {realPlaces.slice(1, 4).map((place) => {
            const config = typeConfig[place.type];
            return (
              <div
                key={place.name}
                style={{
                  height: 76,
                  borderRadius: 10,
                  background: 'rgba(245,240,232,0.08)',
                  border: `1px solid ${colors.line}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '0 18px',
                }}
              >
                <span style={{fontSize: 28}}>{config.icon}</span>
                <div style={{flex: 1, minWidth: 0}}>
                  <div
                    style={{
                      color: colors.textOnDark,
                      fontFamily: fonts.body,
                      fontSize: 23,
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {place.name}
                  </div>
                  <div
                    style={{
                      color: colors.mutedText,
                      fontFamily: fonts.body,
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    {place.neighborhood} · {place.safety}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const MapCanvas: React.FC<{frame: number}> = ({frame}) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 984 1550"
    preserveAspectRatio="none"
    style={{position: 'absolute', inset: 0}}
  >
    <rect width="984" height="1550" fill="#101827" />
    <path d="M-70 260C160 170 286 322 458 244C622 170 760 138 1050 180" fill="none" stroke="rgba(82,183,136,0.16)" strokeWidth="52" strokeLinecap="round" />
    <path d="M-64 920C182 784 328 922 514 820C706 714 806 650 1060 708" fill="none" stroke="rgba(82,183,136,0.14)" strokeWidth="46" strokeLinecap="round" />
    <path d="M-80 1230C180 1158 330 1238 516 1160C692 1084 810 1072 1068 1138" fill="none" stroke="rgba(82,183,136,0.12)" strokeWidth="42" strokeLinecap="round" />
    <path d="M154 -80C230 160 208 372 320 538C450 730 618 842 598 1580" fill="none" stroke="rgba(245,240,232,0.12)" strokeWidth="18" strokeLinecap="round" />
    <path d="M840 -40C748 230 752 470 620 662C460 894 408 1050 456 1600" fill="none" stroke="rgba(245,240,232,0.11)" strokeWidth="16" strokeLinecap="round" />
    <path d="M-40 580C174 568 250 610 384 590C566 564 718 476 1020 512" fill="none" stroke="rgba(245,240,232,0.10)" strokeWidth="14" strokeLinecap="round" />
    <g opacity="0.23" transform={`translate(${Math.sin(frame / 38) * 14} ${Math.cos(frame / 44) * 12})`}>
      <circle cx="300" cy="330" r="210" fill="rgba(82,183,136,0.22)" />
      <circle cx="705" cy="990" r="250" fill="rgba(45,106,79,0.28)" />
    </g>
  </svg>
);
