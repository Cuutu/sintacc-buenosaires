import {useEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';

/** Frena el render hasta que Fraunces y Nunito estén cargadas. */
export const useFonts = () => {
  const [handle] = useState(() => delayRender('Cargando tipografías'));
  useEffect(() => {
    Promise.all(
      [
        'italic 400 80px "Fraunces"',
        'italic 500 80px "Fraunces"',
        'italic 600 80px "Fraunces"',
        '400 40px "Nunito"',
        '500 40px "Nunito"',
        '600 40px "Nunito"',
        '700 40px "Nunito"',
        '800 40px "Nunito"',
      ].map((f) => document.fonts.load(f)),
    )
      .then(() => document.fonts.ready)
      .finally(() => continueRender(handle));
  }, [handle]);
};
