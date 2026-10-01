/** Recreación de components/nav/BottomNav.tsx: la píldora flotante de la web en mobile. */
import React from 'react';
import {CircleUserRound, Heart, MapPinned, Plus, Store} from 'lucide-react';
import {colors} from '../brand';

type Slot = 'sugerir' | 'guardados' | 'mapa' | 'emprendimientos' | 'perfil';

const ITEMS: {key: Slot; Icon: typeof Plus; center?: boolean}[] = [
  {key: 'sugerir', Icon: Plus},
  {key: 'guardados', Icon: Heart},
  {key: 'mapa', Icon: MapPinned, center: true},
  {key: 'emprendimientos', Icon: Store},
  {key: 'perfil', Icon: CircleUserRound},
];

const primary = colors.terracota;

export const BottomNav: React.FC<{active: Slot}> = ({active}) => (
  <div
    style={{
      position: 'absolute',
      left: 8,
      right: 8,
      bottom: 26,
      height: 56,
      borderRadius: 32,
      background: colors.card,
      border: '1px solid rgba(45,74,52,0.11)',
      boxShadow: '0 8px 28px -12px rgba(45,74,52,0.22), inset 0 1px 0 rgba(255,255,255,0.72)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 6px',
      zIndex: 6,
    }}
  >
    {ITEMS.map(({key, Icon, center}) => {
      const on = key === active;
      return (
        <div
          key={key}
          style={{
            position: 'relative',
            width: center ? 48 : 44,
            height: center ? 40 : 44,
            borderRadius: center ? 24 : 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: center && !on ? 'rgba(31,77,53,0.06)' : 'transparent',
          }}
        >
          <Icon
            size={center ? 24 : 22}
            strokeWidth={center ? 2.1 : 1.9}
            color={on ? primary : center ? colors.olive : 'rgba(45,74,52,0.55)'}
          />
          {on ? (
            <span
              style={{
                position: 'absolute',
                bottom: 3,
                width: 10,
                height: 3,
                borderRadius: 2,
                background: primary,
              }}
            />
          ) : null}
        </div>
      );
    })}
  </div>
);
