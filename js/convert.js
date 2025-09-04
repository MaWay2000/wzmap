// convert.js
// Convert Gamma-style game.map data to classic 3-byte-per-tile map format.
// Based on gamma_to_classic.py

// Parse tile types (.ttp or .ttypes) into a mapping table
export function parseTTypes(data) {
  if (!data) return null;

  // Case 1: old plain-text .ttp file
  if (typeof data === "string") {
    const lines = data.split(/\r?\n/);
    const mapping = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const idx = parseInt(parts[0], 10);
        if (!isNaN(idx)) {
          mapping[idx] = idx; // identity mapping
        }
      }
    }
    return mapping;
  }

  // Case 2: binary .ttypes (Gamma format)
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const entryCount = dv.getUint32(8, true);
  const mapping = [];
  for (let i = 0; i < entryCount; i++) {
    for (let rot = 0; rot < 4; rot++) {
      mapping[(i << 2) | rot] = i; // map all 4 rotated IDs to base index
    }
  }
  return mapping;
}

// Convert Gamma-style game.map to Classic 3-byte-per-tile format
export function convertGammaGameMapToClassic(gammaData, ttypesMap) {
  if (!gammaData || gammaData.length < 16) return null;

  // Gamma maps start with "map ("
  if (
    gammaData[0] !== 0x6d || // m
    gammaData[1] !== 0x61 || // a
    gammaData[2] !== 0x70 || // p
    gammaData[3] !== 0x20 || // space
    gammaData[4] !== 0x28    // '('
  ) {
    return null; // not Gamma style
  }

  const dv = new DataView(
    gammaData.buffer,
    gammaData.byteOffset,
    gammaData.byteLength
  );

  const width = dv.getInt32(8, true);
  const height = dv.getInt32(12, true);
  if (width <= 0 || height <= 0) return null;

  const tiles = width * height;
  const gridIn = new DataView(
    gammaData.buffer,
    gammaData.byteOffset + 16,
    tiles * 4
  );

  // Output format: "map " header + version + width + height + 3 bytes/tile
  const out = new Uint8Array(16 + tiles * 3);
  out[0] = 0x6d; // 'm'
  out[1] = 0x61; // 'a'
  out[2] = 0x70; // 'p'
  out[3] = 0x20; // ' '

  const dvOut = new DataView(out.buffer);
  dvOut.setUint32(4, 10, true);     // classic v10 binary map version (3 bytes/tile)
  dvOut.setInt32(8, width, true);
  dvOut.setInt32(12, height, true);

  const TILE_ROTSHIFT = 12;          // from maploader.js

  for (let i = 0; i < tiles; i++) {
    const val = gridIn.getUint32(i * 4, true);
    const tile16 = val & 0xffff;          // lower 16 bits = tile + rotation
    const height16 = val >>> 16;          // upper 16 bits = height

    const baseTile = tile16 >>> 2;        // strip rotation bits
    const rotation = tile16 & 0x03;

    const mappedTile = (ttypesMap && ttypesMap[tile16] !== undefined)
      ? ttypesMap[tile16]
      : baseTile;

    const tilenum = (mappedTile & 0x01ff) | (rotation << TILE_ROTSHIFT);
    dvOut.setUint16(16 + 3 * i, tilenum, true);
    out[16 + 3 * i + 2] = Math.min(height16 >> 1, 255); // scale height to 0–255
  }

  return out;
}
