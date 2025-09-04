// maploader.js

// ------------------------
// Binary .map grid parsing (v10=3 bytes/tile, v39+=4 bytes/tile)
// ------------------------
export function parseBinaryMap(fileData) {
  if (fileData.length < 16 || String.fromCharCode(fileData[0], fileData[1], fileData[2]) !== "map") {
    return null;
  }

  const dv = new DataView(fileData.buffer, fileData.byteOffset, fileData.byteLength);
  const mapVersion = dv.getUint32(4, true);      // 10, 39 or 40
  const width      = dv.getUint32(8, true);
  const height     = dv.getUint32(12, true);

  if (width <= 0 || width > 256 || height <= 0 || height > 256) return null;

  const numTiles = width * height;
  const bytesPerTile = (mapVersion >= 39) ? 4 : 3;
  const gridStart = 16;
  const need = gridStart + numTiles * bytesPerTile;
  if (fileData.length < need) return null;

  const mapTiles     = Array.from({ length: height }, () => Array(width).fill(0));
  const mapRotations = Array.from({ length: height }, () => Array(width).fill(0));
  const mapHeights   = Array.from({ length: height }, () => Array(width).fill(0));
  const mapXFlip     = Array.from({ length: height }, () => Array(width).fill(false));
  const mapYFlip     = Array.from({ length: height }, () => Array(width).fill(false));
  const mapTriFlip   = Array.from({ length: height }, () => Array(width).fill(false));

  let ofs = gridStart;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value;
      if (bytesPerTile === 3) {
        const b0 = fileData[ofs];
        const b1 = fileData[ofs + 1];
        const b2 = fileData[ofs + 2];
        value = b0 | (b1 << 8) | (b2 << 16); // 24-bit little-endian
      } else {
        value = dv.getUint32(ofs, true);     // 32-bit little-endian
      }
      ofs += bytesPerTile;

      const heightVal = value & 0x7ff;            // 11-bit height
      const tileIndex = (value >>> 11) & 0x3ff;   // 10-bit tile id
      const rotation  = (value >>> 21) & 0x3;     // 0..3
      const triFlip   = !!((value >>> 23) & 0x1); // v40 flag23

      mapTiles[y][x]     = tileIndex;
      mapRotations[y][x] = rotation;
      mapHeights[y][x]   = heightVal;
      mapXFlip[y][x]     = false;   // no x/y flip flags in this format
      mapYFlip[y][x]     = false;
      mapTriFlip[y][x]   = triFlip;
    }
  }

  return {
    mapW: width,
    mapH: height,
    mapTiles,
    mapRotations,
    mapHeights,
    mapXFlip,
    mapYFlip,
    mapTriFlip,
    format: "binary",
    mapVersion
  };
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
        mapXFlip: json.xflip ?? [],
        mapYFlip: json.yflip ?? [],
        mapTriFlip: json.triflip ?? [],
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
      return { 
        mapW: width, 
        mapH: height, 
        mapTiles, 
        mapRotations: [], 
        mapHeights: [], 
        mapXFlip: [], 
        mapYFlip: [], 
        mapTriFlip: [], 
        format: "lev" 
      };
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

  // Try binary .map (v10 or v40)
  if (bytes.length >= 16 && String.fromCharCode(bytes[0], bytes[1], bytes[2]) === "map") {
    const binMap = parseBinaryMap(bytes);
    if (binMap) return binMap;
  }

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
