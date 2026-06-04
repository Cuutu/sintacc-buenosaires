import React from 'react';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/dm-sans/800.css';
import '@fontsource/dm-sans/900.css';
import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/jetbrains-mono/800.css';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {LogoLockup} from './components/LogoLockup';
import {MapMockup} from './components/MapMockup';
import {ReviewCard} from './components/ReviewCard';
import {colors, ease, fonts, springConfig} from './tokens';

const fade = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

export const CelimapDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: colors.backgroundDark}}>
      <FontStyles />
      <NoiseOverlay />
      <CameraMotionBlur shutterAngle={90} samples={5}>
        <Sequence from={0} durationInFrames={120}>
          <Hook />
        </Sequence>
        <Sequence from={120} durationInFrames={120}>
          <Problem />
        </Sequence>
        <Sequence from={240} durationInFrames={210}>
          <MapScene />
        </Sequence>
        <Sequence from={450} durationInFrames={150}>
          <CommunityProof />
        </Sequence>
        <Sequence from={600} durationInFrames={120}>
          <CTA />
        </Sequence>
      </CameraMotionBlur>
    </AbsoluteFill>
  );
};

const SceneShell: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{backgroundColor: colors.backgroundDark}}>
    <AnimatedBackground />
    {children}
  </AbsoluteFill>
);

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame: frame - 14, fps, config: {...springConfig, damping: 16}});
  const subtitle = fade(frame, 44, 74);
  const ring = interpolate(frame, [18, 110], [0.72, 1.16], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

  return (
    <SceneShell>
      <div
        style={{
          position: 'absolute',
          left: 190,
          top: 645,
          width: 700,
          height: 250,
          borderRadius: 999,
          background: 'rgba(11, 18, 32, 0.58)',
          border: `1px solid ${colors.line}`,
          boxShadow: '0 42px 120px rgba(0, 0, 0, 0.36), inset 0 1px 0 rgba(245,240,232,0.08)',
          transform: `scale(${ring})`,
          opacity: fade(frame, 12, 44),
        }}
      />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translateY(${interpolate(enter, [0, 1], [34, 0])}px)`,
          opacity: fade(frame, 0, 28),
        }}
      >
        <LogoLockup />
        <div
          style={{
            marginTop: 52,
            color: colors.cream,
            fontFamily: fonts.body,
            fontSize: 42,
            fontWeight: 800,
            opacity: subtitle,
            textShadow: '0 18px 44px rgba(0,0,0,0.46)',
            transform: `translateY(${interpolate(subtitle, [0, 1], [18, 0])}px)`,
          }}
        >
          El mapa colaborativo para celíacos
        </div>
        <div
          style={{
            marginTop: 22,
            color: colors.mutedText,
            fontFamily: fonts.mono,
            fontSize: 22,
            fontWeight: 800,
            opacity: fade(frame, 68, 94),
          }}
        >
          Argentina · Sin TACC · Comunidad
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};

const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lines = [
    {text: 'Encontrá dónde', size: 94, color: colors.cream, weight: 700, delay: 12},
    {text: 'comer sin gluten', size: 94, color: colors.cream, weight: 700, delay: 30},
    {text: 'cerca tuyo.', size: 100, color: colors.mutedGreen, weight: 900, delay: 48},
  ];

  return (
    <SceneShell>
      <div
        style={{
          position: 'absolute',
          width: 1180,
          height: 1180,
          right: interpolate(frame, [0, 120], [-560, -380]),
          top: interpolate(frame, [0, 120], [250, 120]),
          background: 'conic-gradient(from 210deg, transparent, rgba(82,183,136,0.2), transparent, rgba(45,106,79,0.12), transparent)',
          filter: 'blur(70px)',
          opacity: 0.86,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 92,
          right: 92,
          top: 535,
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
        }}
      >
        {lines.map((line) => {
          const s = spring({frame: frame - line.delay, fps, config: {...springConfig, damping: 15}});
          return (
            <div
              key={line.text}
              style={{
                color: line.color,
                fontFamily: fonts.heading,
                fontSize: line.size,
                fontStyle: 'italic',
                fontWeight: line.weight,
                lineHeight: 1.02,
                textShadow: '0 24px 60px rgba(0,0,0,0.46)',
                opacity: fade(frame, line.delay, line.delay + 18),
                transform: `translateY(${interpolate(s, [0, 1], [54, 0])}px)`,
              }}
            >
              {line.text}
            </div>
          );
        })}
        <div
          style={{
            marginTop: 30,
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {['+400 lugares', '+50 usuarios felices', 'Datos de la comunidad'].map((stat, index) => {
            const s = spring({frame: frame - 58 - index * 8, fps, config: {...springConfig, damping: 16}});
            return (
              <div
                key={stat}
                style={{
                  padding: '17px 22px',
                  borderRadius: 999,
                  border: `1px solid ${colors.line}`,
                  background: index === 0 ? 'rgba(82,183,136,0.16)' : 'rgba(245,240,232,0.08)',
                  color: colors.textOnDark,
                  fontFamily: fonts.body,
                  fontSize: 28,
                  fontWeight: 900,
                  boxShadow: '0 18px 48px rgba(0, 0, 0, 0.22)',
                  opacity: s,
                  transform: `translateY(${interpolate(s, [0, 1], [24, 0])}px)`,
                }}
              >
                {stat}
              </div>
            );
          })}
        </div>
      </div>
    </SceneShell>
  );
};

const MapScene: React.FC = () => (
  <SceneShell>
    <MapMockup />
  </SceneShell>
);

const CommunityProof: React.FC = () => {
  const frame = useCurrentFrame();
  const titleIn = fade(frame, 92, 120);

  return (
    <SceneShell>
      <div
        style={{
          position: 'absolute',
          left: 86,
          top: 210,
          width: 820,
          color: colors.cream,
          fontFamily: fonts.heading,
          fontSize: 80,
          fontStyle: 'italic',
          lineHeight: 1.02,
          textShadow: '0 24px 60px rgba(0,0,0,0.42)',
          opacity: fade(frame, 0, 28),
        }}
      >
        Locales reales, cargados por la comunidad.
      </div>
      <ReviewCard
        name="Malvis gluten free"
        meta="Campana"
        badge="100% sin TACC"
        icon="☕"
        delay={30}
        rotate={-2}
        top={545}
      />
      <ReviewCard
        name="Villeco sin gluten"
        meta="Yerba Buena"
        badge="Certificado sin TACC"
        icon="🥐"
        delay={54}
        rotate={1.4}
        top={795}
      />
      <ReviewCard
        name="Dulcemiga"
        meta="Córdoba"
        badge="100% sin TACC"
        icon="🥐"
        delay={78}
        rotate={-1}
        top={1045}
      />
      <div
        style={{
          position: 'absolute',
          left: 86,
          right: 86,
          bottom: 200,
          color: colors.textOnDark,
          fontFamily: fonts.body,
          fontSize: 38,
          fontWeight: 800,
          opacity: titleIn,
          transform: `translateY(${interpolate(titleIn, [0, 1], [20, 0])}px)`,
        }}
      >
        Sugerencias revisadas, niveles de seguridad y datos de contacto en un solo lugar.
      </div>
    </SceneShell>
  );
};

const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const logoIn = spring({frame: frame - 8, fps, config: {...springConfig, damping: 16}});
  const headline = spring({frame: frame - 32, fps, config: {...springConfig, damping: 17}});
  const pill = spring({frame: frame - 66, fps, config: {...springConfig, damping: 16}});

  return (
    <SceneShell>
      <div
        style={{
          position: 'absolute',
          left: 170,
          right: 170,
          top: 445,
          height: 720,
          borderRadius: 28,
          background: 'rgba(11, 18, 32, 0.34)',
          border: `1px solid rgba(245,240,232,0.08)`,
          boxShadow: '0 44px 130px rgba(0,0,0,0.26), inset 0 1px 0 rgba(245,240,232,0.05)',
          opacity: fade(frame, 0, 30),
        }}
      />
      <AbsoluteFill style={{alignItems: 'center'}}>
        <div
          style={{
            marginTop: 330,
            opacity: fade(frame, 0, 28),
            transform: `translateY(${interpolate(logoIn, [0, 1], [42, 0])}px) scale(${interpolate(logoIn, [0, 1], [0.94, 1])})`,
          }}
        >
          <LogoLockup size="large" />
        </div>
        <div
          style={{
            marginTop: 76,
            width: 840,
            color: colors.cream,
            fontFamily: fonts.heading,
            fontSize: 72,
            fontStyle: 'italic',
            fontWeight: 700,
            lineHeight: 1.06,
            textAlign: 'center',
            opacity: headline,
            textShadow: '0 26px 70px rgba(0,0,0,0.5)',
            transform: `translateY(${interpolate(headline, [0, 1], [46, 0])}px)`,
          }}
        >
          Lugares aptos para celíacos, cerca tuyo.
        </div>
        <div
          style={{
            marginTop: 42,
            display: 'flex',
            gap: 14,
            opacity: fade(frame, 50, 74),
          }}
        >
          {['+400 lugares', '+50 usuarios felices'].map((label) => (
            <div
              key={label}
              style={{
                padding: '16px 20px',
                borderRadius: 999,
                background: 'rgba(245,240,232,0.09)',
                border: `1px solid ${colors.line}`,
                color: colors.textOnDark,
                fontFamily: fonts.body,
                fontSize: 26,
                fontWeight: 900,
              }}
            >
              {label}
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 56,
            padding: '25px 56px',
            borderRadius: 999,
            border: `2px solid ${colors.mutedGreen}`,
            background: 'rgba(45,106,79,0.2)',
            color: colors.cream,
            fontFamily: fonts.mono,
            fontSize: 42,
            fontWeight: 900,
            opacity: pill,
            transform: `translateY(${interpolate(pill, [0, 1], [28, 0])}px)`,
            boxShadow: '0 0 70px rgba(82, 183, 136, 0.18), inset 0 1px 0 rgba(245,240,232,0.16)',
          }}
        >
          celimap.com.ar
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};

const AnimatedBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 36;
  const driftY = Math.cos(frame / 110) * 42;

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, #0b1220 0%, #08111d 45%, #0d1a24 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.52,
          background:
            'linear-gradient(130deg, transparent 0%, rgba(82,183,136,0.08) 32%, transparent 54%), linear-gradient(24deg, transparent 0%, rgba(245,240,232,0.05) 42%, transparent 58%)',
          transform: `translate(${drift}px, ${driftY}px)`,
        }}
      />
      <svg
        width="1080"
        height="1920"
        viewBox="0 0 1080 1920"
        style={{position: 'absolute', inset: 0, opacity: 0.5}}
      >
        <defs>
          <pattern id="celimap-grid" width="118" height="118" patternUnits="userSpaceOnUse">
            <path d="M118 0H0V118" fill="none" stroke="rgba(245,240,232,0.035)" strokeWidth="2" />
          </pattern>
        </defs>
        <rect width="1080" height="1920" fill="url(#celimap-grid)" />
        <g transform={`translate(${drift * 0.45} ${driftY * 0.25})`}>
          <path d="M-120 430C210 300 350 470 560 350C760 235 890 250 1180 140" fill="none" stroke="rgba(245,240,232,0.045)" strokeWidth="10" strokeLinecap="round" />
          <path d="M820 -120C690 260 740 520 610 770C470 1040 440 1260 520 2060" fill="none" stroke="rgba(245,240,232,0.045)" strokeWidth="9" strokeLinecap="round" />
          <path d="M140 -80C250 250 190 520 350 760C510 1000 650 1180 620 2060" fill="none" stroke="rgba(82,183,136,0.055)" strokeWidth="12" strokeLinecap="round" />
        </g>
        <g opacity="0.42">
          {[
            [160, 480],
            [860, 360],
            [220, 1370],
            [900, 1280],
            [560, 1640],
          ].map(([x, y], index) => (
            <circle
              key={`${x}-${y}`}
              cx={x + Math.sin(frame / 38 + index) * 6}
              cy={y + Math.cos(frame / 42 + index) * 6}
              r={index === 2 ? 5 : 4}
              fill={colors.mutedGreen}
            />
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

const NoiseOverlay: React.FC = () => (
  <svg
    width="1080"
    height="1920"
    viewBox="0 0 1080 1920"
    style={{
      position: 'absolute',
      inset: 0,
      opacity: 0.045,
      pointerEvents: 'none',
      mixBlendMode: 'screen',
      zIndex: 10,
    }}
  >
    <filter id="celimap-grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="1080" height="1920" filter="url(#celimap-grain)" />
  </svg>
);

const FontStyles: React.FC = () => (
  <style>
    {`
      * {
        font-synthesis: none;
        text-rendering: geometricPrecision;
      }
    `}
  </style>
);
