import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FoodArt, type ArtKind} from '../components/FoodArt';

const KINDS: ArtKind[] = ['pan', 'torta', 'vianda', 'pizza', 'alfajores'];

/** Laboratorio: todas las ilustraciones juntas, para revisarlas rápido. */
export const ArtLab: React.FC = () => (
  <AbsoluteFill style={{background: '#F3EEE4', flexDirection: 'row', flexWrap: 'wrap', gap: 20, padding: 20}}>
    {KINDS.map((k) => (
      <div key={k} style={{width: 600, height: 450, borderRadius: 24, overflow: 'hidden'}}>
        <FoodArt kind={k} />
      </div>
    ))}
  </AbsoluteFill>
);
