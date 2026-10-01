// Genera public/logo-crema.png a partir del logo negativo de la web
// (public/brand/logo-principal-neg.png). Los "huecos" de las letras y las hojas
// vienen en verde muy oscuro (#203121); acá se recolorean a #1F4D35 para que
// se fundan con el fondo verde de los reels.
const fs = require('fs');
const path = require('path');
const {PNG} = require('pngjs');

const src = path.join(__dirname, '..', '..', 'public', 'brand', 'logo-principal-neg.png');
const out = path.join(__dirname, '..', 'public', 'logo-crema.png');
const target = [0x1f, 0x4d, 0x35];

const png = PNG.sync.read(fs.readFileSync(src));
for (let i = 0; i < png.data.length; i += 4) {
  const [r, g, b, a] = png.data.slice(i, i + 4);
  if (a === 0) continue;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Oscuro y verdoso (no terracota): pasa al verde de marca.
  if (lum < 90 && g >= r) {
    png.data[i] = target[0];
    png.data[i + 1] = target[1];
    png.data[i + 2] = target[2];
  }
}
fs.writeFileSync(out, PNG.sync.write(png));
console.log('OK ->', out);
