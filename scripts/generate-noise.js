const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const size = 256;
const png = new PNG({ width: size, height: size });

for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const idx = (size * y + x) << 2;
    const noise = Math.floor(Math.random() * 256);
    png.data[idx] = noise;
    png.data[idx + 1] = noise;
    png.data[idx + 2] = noise;
    png.data[idx + 3] = 255;
  }
}

png.pack()
  .pipe(fs.createWriteStream(path.join(__dirname, "../public/noise.png")))
  .on("finish", () => console.log("noise.png creado en public/"));
