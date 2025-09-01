// maploader.js

// .map grid parsing (3 bytes/tile)
export function parseMapGrid(fileData) {
  if (
    fileData.length >= 16 &&
    String.fromCharCode(...fileData.slice(0, 4)) === "map "
  ) {
    let width = fileData[8] | (fileData[9] << 8) | (fileData[10] << 16) | (fileData[11] << 24);
    let height = fileData[12] | (fileData[13] << 8) | (fileData[14] << 16) | (fileData[15] << 24);
    let gridStart = 16;
    if (width > 0 && width <= 256 && height > 0 && height <= 256 && fileData.length >= gridStart + width * height * 3) {
      let mapTiles = Array(height).fill().map(() => Array(width).fill(0));
      let mapRotations = Array(height).fill().map(() => Array(width).fill(0));
      let mapHeights = Array(height).fill().map(() => Array(width).fill(0));
      for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
          let ofs = gridStart + 3 * (y * width + x);
          const rotByte = fileData[ofs + 1];
          // Tile index uses the low byte plus the low nibble of the second byte
          // (allowing up to 4096 tiles). This mirrors how tiles are stored inside
          // .wz archives as well as standalone .map files.
          mapTiles[y][x] = fileData[ofs] | ((rotByte & 0x0f) << 8);
          // rotation is stored in bits 4-5 of the rotation byte. Values may
          // include additional high-bit flip flags (e.g. bit 7). Extract a 0-3
          // rotation index by shifting the upper nibble and masking.
          mapRotations[y][x] = (rotByte >> 4) & 0x03;
          mapHeights[y][x] = fileData[ofs + 2];
        }
      }
      return { mapW: width, mapH: height, mapTiles, mapRotations, mapHeights };
    }
  }
  return null;
}

// Detect tileset from .ttp file (big-endian)
export async function getTilesetIndexFromTtp(zip, TTP_TILESET_MAP) {
  const ttpFileName = Object.keys(zip.files).find(f => f.toLowerCase().endsWith(".ttp"));
  if (!ttpFileName) return 0;
  const ttpData = await zip.files[ttpFileName].async("uint8array");
  const code = (ttpData[12] << 8) | ttpData[13];
  let idx = TTP_TILESET_MAP[code] ?? 0;
  console.log(`Tileset code from ${ttpFileName}: 0x${code.toString(16).padStart(4, '0')} => idx ${idx}`);
  return idx;
}
