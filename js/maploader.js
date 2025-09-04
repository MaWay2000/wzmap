// maploader.js
import { convertGammaGameMapToClassic } from './convert.js';

// ------------------------
// Binary .map grid parsing
// ------------------------
export function parseBinaryMap(fileData) {
  if (
    fileData.length >= 16 &&
    String.fromCharCode(...fileData.slice(0, 3)) === "map"
  ) {
    let width = fileData[8] | (fileData[9] << 8) | (fileData[10] << 16) | (fileData[11] << 24);
    let height = fileData[12] | (fileData[13] << 8) | (fileData[14] << 16) | (fileData[15] << 24);

    let gridStart = 16;

    if (
      width > 0 && width <= 256 &&
      height > 0 && height <= 256 &&
      fileData.length >= gridStart + width * height * 3
    ) {
      let mapTiles = Array(height).fill().map(() => Array(width).fill(0));
      let mapRotations = Array(height).fill().map(() => Array(width).fill(0));
      let mapHeights = Array(height).fill().map(() => Array(width).fill(0));

      for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
          let ofs = gridStart + 3 * (y * width + x);
          mapTiles[y][x] = fileData[ofs];
          mapRotations[y][x] = (fileData[ofs + 1] >> 4) & 0x03;
          mapHeights[y][x] = fileData[ofs + 2];
        }
      }
      return { mapW: width, mapH: height, mapTiles, mapRotations, mapHeights, format: "binary" };
    }
  }
  return null;
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
// .lev map parsing (very old)
// ------------------------
export function parseLevMap(fileData) {
  if (fileData.length > 32) {
    let width = fileData[0];
    let height = fileData[1];
    if (width > 0 && width <= 256 && height > 0 && height <= 256) {
      let mapTiles = Array(height).fill().map(() => Array(width).fill(0));
      for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
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

  // 1. Try JSON
  const text = new TextDecoder().decode(bytes);
  const jsonMap = parseJSONMap(text);
  if (jsonMap) return jsonMap;

  // 2. Try Gamma -> convert -> Binary
  if (bytes[0] === 0x6d && bytes[1] === 0x61 && bytes[2] === 0x70 && bytes[3] === 0x20 && bytes[4] === 0x28) {
    const converted = convertGammaGameMapToClassic(bytes, null);
    if (converted) {
      const gammaAsBinary = parseBinaryMap(converted);
      if (gammaAsBinary) {
        gammaAsBinary.format = "gamma";
        return gammaAsBinary;
      }
    }
  }

  // 3. Try Binary .map
  const binMap = parseBinaryMap(bytes);
  if (binMap) return binMap;

  // 4. Try .lev
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
  let idx = TTP_TILESET_MAP[code] ?? 0;
  console.log(`Tileset code from ${ttpFileName}: 0x${code.toString(16).padStart(4, '0')} => idx ${idx}`);
  return idx;
}
