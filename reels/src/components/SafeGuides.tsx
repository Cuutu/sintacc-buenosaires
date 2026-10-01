import React from 'react';
import {AbsoluteFill} from 'remotion';
import {safe, video} from '../brand';

/** Guía de revisión: zonas que tapa la interfaz de Instagram y recorte 4:5 del feed. */
export const SafeGuides: React.FC<{feed?: boolean}> = ({feed = false}) => {
  const zone = 'rgba(220,40,40,0.28)';
  const feedTop = (video.height - 1350) / 2;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: safe.top, background: zone}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: safe.bottom, background: zone}} />
      <div style={{position: 'absolute', right: 0, top: safe.top, bottom: safe.bottom, width: safe.right, background: zone}} />
      {feed ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: feedTop,
            height: 1350,
            outline: '6px dashed rgba(40,90,220,0.8)',
            outlineOffset: -6,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
