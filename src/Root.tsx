import React from 'react';
import {Composition} from 'remotion';
import {CelimapDemo} from './CelimapDemo';
import {timing} from './tokens';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="CelimapDemo"
    component={CelimapDemo}
    durationInFrames={timing.durationInFrames}
    fps={timing.fps}
    width={timing.width}
    height={timing.height}
  />
);
