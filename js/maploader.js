// maploader.js

// --- Constants from WZ sources ---
const ELEVATION_SCALE = 2;             // v39 stores height/2 in a byte
const TILE_XFLIP   = 0x8000;
const TILE_YFLIP   = 0x4000;
const TILE_ROTMASK = 0x3000;
const TILE_ROTSHIFT = 12;
const TILE_TRIFLIP = 0x0800;
const TILE_NUMMASK = 0x01ff;           // 9-bit tile index

// ------------------------
// Binary .map grid parsing (v39=3 bytes/tile, v40+=4 bytes/tile)
// ------------------------
export function parseBinaryMap(fileData) {
  if (fileData.length < 16 || String.fromCharCode(fileData[0], fileData[1], fileData[2]) !== "map") {
    return null;
  }

  const dv = new DataView(fileData.buffer, fileData.byteOffset, fileData.byteLength);
  const mapVersion = dv.getUint32(4, true);      // 39 or 40+
  const width      = dv.getUint32(8, true);
  const height     = dv.getUint32(12, true);

  if (width <= 0 || width > 256 || height <= 0 || height > 256) return null;

  const numTiles = width * height;
  const bytesPerTile = (mapVersion >= 40) ? 4 : 3;
  const gridStart = 16;
  const need = gridStart + numTiles * bytesPerTile;
  if (fileData.length < need) return null;

  const mapTiles     = Array.from({ length: height }, () => Array(width).fill(0));
  const mapRotations = Array.from({ length: height }, () => Array(width).fill(0));
  const mapHeights   = Array.from({ length: height }, () => Array(width).fill(0));

  let ofs = gridStart;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mapVersion >= 40) {
        // --- v40+ format: 2 bytes texture + 2 bytes full-range height ---
        const tilenum = dv.getUint16(ofs, true); ofs += 2;
        const height16 = dv.getUint16(ofs, true); ofs += 2;

        const tileIndex = tilenum & TILE_NUMMASK;
        const rotation  = (tilenum & TILE_ROTMASK) >> TILE_ROTSHIFT;

        mapTiles[y][x]     = tileIndex;
        mapRotations[y][x] = rotation;
        mapHeights[y][x]   = height16;
      } else {
        // --- v39 format: 2 bytes texture + 1 byte height (scaled ×2) ---
        const tilenum = dv.getUint16(ofs, true); ofs += 2;
        const hByte   = dv.getUint8(ofs); ofs += 1;

        const tileIndex = tilenum & TILE_NUMMASK;
        const rotation  = (tilenum & TILE_ROTMASK) >> TILE_ROTSHIFT;
        const height8   = hByte * ELEVATION_SCALE;

        mapTiles[y][x]     = tileIndex;
        mapRotations[y][x] = rotation;
        mapHeights[y][x]   = height8;
      }
    }
  }

  return { mapW: width, mapH: height, mapTiles, mapRotations, mapHeights, format: "binary", mapVersion };
}

// ------------------------
// JSON map parsing
// ------------------------
export function parseJSONMap(text) {
  try {
    const json = JSON.parse(text);
    if (json.mapW && json.mapH && json.tiles) {
      return {
        mapW: json.mapW,
        mapH: json.mapH,
        mapTiles: json.tiles,
        mapRotations: json.rotations ?? [],
        mapHeights: json.heights ?? [],
        format: "json"
      };
    }
  } catch (e) {}
  return null;
}

// ------------------------
// .lev map parsing (very old format — placeholder; adjust if needed)
// ------------------------
export function parseLevMap(fileData) {
  if (fileData.length > 32) {
    const width = fileData[0];
    const height = fileData[1];
    if (width > 0 && width <= 256 && height > 0 && height <= 256) {
      const mapTiles = Array.from({ length: height }, () => Array(width).fill(0));
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          mapTiles[y][x] = fileData[2 + y * width + x];
        }
      }
      return { mapW: width, mapH: height, mapTiles, mapRotations: [], mapHeights: [], format: "lev" };
    }
  }
  return null;
}

// ------------------------
// Unified loader
// ------------------------
export async function loadMapUnified(input) {
  let buffer;
  if (input instanceof File) {
    buffer = await input.arrayBuffer();
  } else if (typeof input === "string") {
    const res = await fetch(input);
    buffer = await res.arrayBuffer();
  } else {
    throw new Error("Unsupported input type");
  }

  const bytes = new Uint8Array(buffer);

  // Try JSON
  const text = new TextDecoder().decode(bytes);
  const jsonMap = parseJSONMap(text);
  if (jsonMap) return jsonMap;

  // Try binary .map (v39/v40)
  const binMap = parseBinaryMap(bytes);
  if (binMap) return binMap;

  // Try .lev
  const levMap = parseLevMap(bytes);
  if (levMap) return levMap;

  throw new Error("Unknown or unsupported map format");
}

// ------------------------
// Tileset detection (.ttp)
// ------------------------
export async function getTilesetIndexFromTtp(zip, TTP_TILESET_MAP) {
  const ttpFileName = Object.keys(zip.files).find(f => f.toLowerCase().endsWith(".ttp"));
  if (!ttpFileName) return 0;

  const ttpData = await zip.files[ttpFileName].async("uint8array");
  const code = (ttpData[12] << 8) | ttpData[13];
  const idx = TTP_TILESET_MAP[code] ?? 0;
  console.log(`Tileset code from ${ttpFileName}: 0x${code.toString(16).padStart(4, '0')} => idx ${idx}`);
  return idx;
}
