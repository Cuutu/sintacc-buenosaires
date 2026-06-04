import {Easing} from 'remotion';

export const colors = {
  backgroundDark: '#0b1220',
  cream: '#f5f0e8',
  forest: '#2d6a4f',
  mutedGreen: '#52b788',
  textOnDark: '#e8e4dc',
  mutedText: 'rgba(232, 228, 220, 0.68)',
  panel: 'rgba(245, 240, 232, 0.08)',
  panelStrong: 'rgba(245, 240, 232, 0.14)',
  line: 'rgba(245, 240, 232, 0.16)',
} as const;

export const fonts = {
  heading: '"DM Serif Display", Georgia, serif',
  body: '"DM Sans", Inter, Arial, sans-serif',
  mono: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
} as const;

export const timing = {
  fps: 30,
  durationInFrames: 720,
  width: 1080,
  height: 1920,
} as const;

export const springConfig = {
  mass: 0.5,
  damping: 12,
} as const;

export const ease = Easing.bezier(0.22, 1, 0.36, 1);
