// Convert Gamma-style game.map data to classic 3-byte-per-tile map format.
// Based on gamma_to_classic.py

export function convertGammaGameMapToClassic(gammaData) {
  if (!gammaData || gammaData.length < 12) return null;
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
  // Gamma maps include 4 extra bytes after the "map (" header
  // before the width/height pair. The original implementation
  // read width/height starting at offset 4 which produced
  // incorrect dimensions and misaligned tile data. Read them
  // from the correct offsets and skip the extra 4-byte field.
  const width = dv.getInt32(8, true);
  const height = dv.getInt32(12, true);
  if (width <= 0 || height <= 0) return null;
  const tiles = width * height;
  const gridIn = new DataView(
    gammaData.buffer,
    // Tile data starts after the 16-byte header
    gammaData.byteOffset + 16,
    tiles * 4
  );

  // Output format: "map " header + unused 4 bytes + width + height + 3 bytes per tile
  const out = new Uint8Array(16 + tiles * 3);
  out[0] = 0x6d; // 'm'
  out[1] = 0x61; // 'a'
  out[2] = 0x70; // 'p'
  out[3] = 0x20; // ' '
  const dvOut = new DataView(out.buffer);
  dvOut.setInt32(8, width, true);
  dvOut.setInt32(12, height, true);

  for (let i = 0; i < tiles; i++) {
    const val = gridIn.getUint32(i * 4, true);
    const height16 = val & 0xffff;
    const tile16 = (val >>> 16) & 0xffff;
    out[16 + 3 * i] = tile16 & 0xff;
    out[16 + 3 * i + 1] = 0; // rotation unknown -> 0
    out[16 + 3 * i + 2] = height16 >>> 8; // keep top 8 bits
  }

  return out;
}
