import fs from 'fs';
import path from 'path';

// Let's create a valid 32x32 PNG with a green & gold sprout icon
// and wrap it in a standard ICO header container.

// A 32x32 PNG raw bitmap generator
function createIconPng() {
  const width = 32;
  const height = 32;
  const buffer = Buffer.alloc(width * height * 4);

  // Background: Deep Navy (#1B254B -> 27, 37, 75, 255)
  // Circle / icon: Emerald Green (#22C55E -> 34, 197, 94) & Golden Saffron (#EAB308 -> 234, 179, 8)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - 15.5;
      const dy = y - 15.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= 14) {
        // Navy base
        buffer[idx] = 27;
        buffer[idx + 1] = 37;
        buffer[idx + 2] = 75;
        buffer[idx + 3] = 255;

        // Stem & Leaf
        if (x >= 14 && x <= 17 && y >= 8 && y <= 24) {
          // Gold stalk
          buffer[idx] = 234;
          buffer[idx + 1] = 179;
          buffer[idx + 2] = 8;
          buffer[idx + 3] = 255;
        } else if (x < 14 && y > 10 && y < 22 && (14 - x) * 1.2 + (y - 16) * (y - 16) * 0.2 < 7) {
          // Green leaf left
          buffer[idx] = 34;
          buffer[idx + 1] = 197;
          buffer[idx + 2] = 94;
          buffer[idx + 3] = 255;
        } else if (x > 17 && y > 10 && y < 22 && (x - 17) * 1.2 + (y - 16) * (y - 16) * 0.2 < 7) {
          // Gold wheat grain right
          buffer[idx] = 250;
          buffer[idx + 1] = 204;
          buffer[idx + 2] = 21;
          buffer[idx + 3] = 255;
        }
      } else if (dist <= 15) {
        // Border ring: Emerald green
        buffer[idx] = 34;
        buffer[idx + 1] = 197;
        buffer[idx + 2] = 94;
        buffer[idx + 3] = 255;
      } else {
        // Transparent
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 0;
      }
    }
  }

  // Generate uncompressed raw PNG or BMP for ICO
  // Construct a standard 32x32 BMP for Windows Icon format
  const bmpHeaderSize = 40;
  const imageSize = width * height * 4;
  const maskSize = (width * height) / 8;
  const totalSize = bmpHeaderSize + imageSize + maskSize;

  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // 1 Image

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(width, 0);
  dirEntry.writeUInt8(height, 1);
  dirEntry.writeUInt8(0, 2); // Color palette
  dirEntry.writeUInt8(0, 3); // Reserved
  dirEntry.writeUInt16LE(1, 4); // Color planes
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel
  dirEntry.writeUInt32LE(totalSize, 8); // Size of image data
  dirEntry.writeUInt32LE(6 + 16, 12); // Offset of image data

  const bmpHeader = Buffer.alloc(bmpHeaderSize);
  bmpHeader.writeUInt32LE(bmpHeaderSize, 0);
  bmpHeader.writeInt32LE(width, 4);
  bmpHeader.writeInt32LE(height * 2, 8); // Icon height is doubled for XOR + AND mask
  bmpHeader.writeUInt16LE(1, 12); // Planes
  bmpHeader.writeUInt16LE(32, 14); // 32-bit RGBA
  bmpHeader.writeUInt32LE(0, 16); // BI_RGB (uncompressed)
  bmpHeader.writeUInt32LE(imageSize + maskSize, 20);
  bmpHeader.writeInt32LE(0, 24);
  bmpHeader.writeInt32LE(0, 28);
  bmpHeader.writeUInt32LE(0, 32);
  bmpHeader.writeUInt32LE(0, 36);

  // BMP pixel data is bottom-to-top BGRA
  const pixelData = Buffer.alloc(imageSize);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = ((height - 1 - y) * width + x) * 4;
      const dstIdx = (y * width + x) * 4;
      pixelData[dstIdx] = buffer[srcIdx + 2]; // B
      pixelData[dstIdx + 1] = buffer[srcIdx + 1]; // G
      pixelData[dstIdx + 2] = buffer[srcIdx]; // R
      pixelData[dstIdx + 3] = buffer[srcIdx + 3]; // A
    }
  }

  const andMask = Buffer.alloc(maskSize, 0); // 0 = opaque

  return Buffer.concat([icoHeader, dirEntry, bmpHeader, pixelData, andMask]);
}

const icoBuffer = createIconPng();
fs.writeFileSync(path.resolve('public/favicon.ico'), icoBuffer);
console.log('✅ Generated official Kisan Setu favicon.ico (' + icoBuffer.length + ' bytes)');
