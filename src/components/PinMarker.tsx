import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, springConfig} from '../tokens';

type PinMarkerProps = {
  x: number;
  y: number;
  delay?: number;
  active?: boolean;
  size?: number;
  color?: string;
  icon?: string;
};

export const PinMarker: React.FC<PinMarkerProps> = ({
  x,
  y,
  delay = 0,
  active = false,
  size = 44,
  color = colors.forest,
  icon,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({
    frame: frame - delay,
    fps,
    config: springConfig,
  });
  const pulse = active
    ? interpolate(Math.sin((frame - delay) / 8), [-1, 1], [0.86, 1.14])
    : 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        transform: `translate(-50%, -100%) scale(${pop * pulse})`,
        transformOrigin: '50% 100%',
        filter: 'drop-shadow(0 18px 22px rgba(0, 0, 0, 0.38))',
      }}
    >
      {active ? (
        <div
          style={{
            position: 'absolute',
            inset: -14,
            borderRadius: 999,
            border: `3px solid ${colors.mutedGreen}`,
            opacity: interpolate(Math.sin(frame / 10), [-1, 1], [0.18, 0.42]),
          }}
        />
      ) : null}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 999,
          background: color,
          border: `${active ? 4 : 3}px solid ${colors.cream}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.cream,
          fontSize: size * 0.42,
          fontWeight: 900,
          boxShadow: '0 4px 10px rgba(0,0,0,0.26)',
        }}
      >
        {icon ?? ''}
      </div>
    </div>
  );
};
