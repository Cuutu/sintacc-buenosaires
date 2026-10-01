import React from 'react';
import {colors, fonts} from '../brand';

/** Tamaño lógico de la pantalla (px CSS de un iPhone). */
export const SCREEN_W = 390;
export const SCREEN_H = 818;
export const STATUS_H = 48;

type PhoneProps = {
  /** Ancho total del teléfono en px del video. */
  width: number;
  children: React.ReactNode;
};

/** Marco de iPhone simple: bisel, isla y barra de estado. El contenido va en px lógicos. */
export const Phone: React.FC<PhoneProps> = ({width, children}) => {
  const bezel = 14;
  const screenW = width - bezel * 2;
  const scale = screenW / SCREEN_W;
  const screenH = SCREEN_H * scale;
  const height = screenH + bezel * 2;

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 78,
        background: '#15271D',
        padding: bezel,
        boxShadow:
          '0 60px 90px -40px rgba(31,77,53,0.55), 0 20px 40px -20px rgba(31,77,53,0.35), inset 0 0 0 2px #2E4A3A',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: screenW,
          height: screenH,
          borderRadius: 64,
          overflow: 'hidden',
          position: 'relative',
          background: colors.cremaFondo,
        }}
      >
        <div
          style={{
            width: SCREEN_W,
            height: SCREEN_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'relative',
            fontFamily: fonts.sans,
            color: colors.olive,
          }}
        >
          {children}
          <StatusBar />
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              width: 134,
              height: 5,
              marginLeft: -67,
              borderRadius: 3,
              background: 'rgba(31,77,53,0.85)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

const StatusBar: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: STATUS_H,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 30px 0 34px',
      fontSize: 16,
      fontWeight: 700,
      color: colors.verde,
      background: colors.cremaFondo,
      zIndex: 5,
    }}
  >
    <span>9:41</span>
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: 11,
        width: 118,
        height: 32,
        marginLeft: -59,
        borderRadius: 20,
        background: '#0E1A13',
      }}
    />
    <svg width="70" height="14" viewBox="0 0 70 14" fill={colors.verde}>
      <rect x="0" y="9" width="3.5" height="5" rx="1" />
      <rect x="5.5" y="6" width="3.5" height="8" rx="1" />
      <rect x="11" y="3" width="3.5" height="11" rx="1" />
      <rect x="16.5" y="0" width="3.5" height="14" rx="1" />
      <path d="M33 4.5a9 9 0 0 1 12 0l-1.6 1.7a6.6 6.6 0 0 0-8.8 0zM36 7.7a4.6 4.6 0 0 1 6 0L39 11z" />
      <rect x="47" y="1" width="21" height="12" rx="3.5" fill="none" stroke={colors.verde} strokeWidth="1.3" />
      <rect x="49" y="3" width="15" height="8" rx="2" />
    </svg>
  </div>
);
