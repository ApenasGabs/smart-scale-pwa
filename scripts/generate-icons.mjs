import fs from 'fs';
import zlib from 'zlib';

function createCrc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCrc32Table();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);
  const crcTarget = Buffer.concat([Buffer.from(type), data]);
  chunk.writeUInt32BE(crc32(crcTarget), 8 + len);
  return chunk;
}

function generatePng(size, primaryColor, secondaryColor) {
  const width = size;
  const height = size;

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines: width * 4 + 1 filter byte per line
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.45;
  const innerRadius = width * 0.35;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = 15, g = 23, b = 42, a = 255; // Slate-900 background

      if (dist <= radius) {
        // Teal base
        r = primaryColor[0];
        g = primaryColor[1];
        b = primaryColor[2];

        // Inner circle
        if (dist <= innerRadius) {
          r = secondaryColor[0];
          g = secondaryColor[1];
          b = secondaryColor[2];
        }

        // Display screen in center
        if (Math.abs(dx) <= width * 0.22 && Math.abs(dy + height * 0.1) <= height * 0.08) {
          r = 15; g = 23; b = 42; // Dark display
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const teal = [20, 184, 166];
const darkTeal = [13, 148, 136];

fs.writeFileSync('public/pwa-192x192.png', generatePng(192, teal, darkTeal));
fs.writeFileSync('public/pwa-512x512.png', generatePng(512, teal, darkTeal));
fs.writeFileSync('public/apple-touch-icon.png', generatePng(192, teal, darkTeal));
console.log('Ícones PWA gerados com sucesso!');
