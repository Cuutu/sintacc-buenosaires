import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts, springConfig} from '../tokens';

type ReviewCardProps = {
  name: string;
  meta: string;
  badge: string;
  delay: number;
  rotate: number;
  top: number;
  icon: string;
};

export const ReviewCard: React.FC<ReviewCardProps> = ({
  name,
  meta,
  badge,
  delay,
  rotate,
  top,
  icon,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: springConfig,
  });
  const opacity = interpolate(frame - delay, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top,
        right: 82,
        width: 842,
        minHeight: 220,
        padding: '34px 40px',
        borderRadius: 8,
        border: `1px solid ${colors.line}`,
        background: 'rgba(245, 240, 232, 0.94)',
        boxShadow: '0 28px 80px rgba(0, 0, 0, 0.34)',
        opacity,
        transform: `translateX(${interpolate(enter, [0, 1], [440, 0])}px) rotate(${rotate}deg)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          color: colors.backgroundDark,
          fontFamily: fonts.body,
          fontSize: 30,
          fontWeight: 800,
          marginBottom: 18,
        }}
      >
        <span
          style={{
            width: 58,
            height: 58,
            borderRadius: 999,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.backgroundDark,
            color: colors.cream,
          }}
        >
          {icon}
        </span>
        <span>{meta}</span>
      </div>
      <div
        style={{
          color: colors.backgroundDark,
          fontFamily: fonts.heading,
          fontSize: 50,
          fontStyle: 'italic',
          lineHeight: 1.12,
        }}
      >
        {name}
      </div>
      <div
        style={{
          display: 'inline-flex',
          color: colors.forest,
          background: 'rgba(82, 183, 136, 0.16)',
          border: '1px solid rgba(45, 106, 79, 0.24)',
          borderRadius: 999,
          padding: '9px 14px',
          fontFamily: fonts.body,
          fontSize: 22,
          fontWeight: 900,
          marginTop: 18,
        }}
      >
        {badge}
      </div>
    </div>
  );
};
