import React from 'react';
import {Img, staticFile} from 'remotion';

type LogoLockupProps = {
  size?: 'small' | 'large';
  centered?: boolean;
  markOnly?: boolean;
};

const dimensions = {
  small: {width: 310, mark: 92},
  large: {width: 620, mark: 168},
};

export const LogoLockup: React.FC<LogoLockupProps> = ({
  size = 'large',
  centered = true,
  markOnly = false,
}) => {
  const d = dimensions[size];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: centered ? 'center' : 'flex-start',
      }}
    >
      <Img
        src={staticFile(markOnly ? 'CelimapLOGO.png' : 'celimaplogocompleto.png')}
        style={{
          width: markOnly ? d.mark : d.width,
          height: 'auto',
          objectFit: 'contain',
          filter: 'drop-shadow(0 22px 42px rgba(0, 0, 0, 0.34))',
        }}
      />
    </div>
  );
};
