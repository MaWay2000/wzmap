// tileset.js — compact tile set utilities for WZ Map Maker
// Exports: TILESETS, setTilesBase, getTileCount, getTileFolder,
//          buildTileUrl, loadAllTiles, clearTileCache

export const TILESETS = [
  { name: 'Arizona',         folder: 'tertilesc1hw-128', count: 78 },
  // Urban tileset actually provides 81 tiles, so load them all
  { name: 'Urban',           folder: 'tertilesc2hw-128', count: 81 },
  // Rocky Mountains tileset has 80 tiles available
  { name: 'Rocky Mountains', folder: 'tertilesc3hw-128', count: 80 },
];

let __tilesBase =
  (typeof window !== 'undefined' && window.TILES_BASE)
    ? window.TILES_BASE
    : 'classic/texpages/';

function clampIndex(i, n) {
  i = (i | 0);
  if (i < 0) return 0;
  if (i >= n) return n - 1;
  return i;
}

export function setTilesBase(base) {
  if (!base) return;
  __tilesBase = base.endsWith('/') ? base : base + '/';
  if (typeof window !== 'undefined') window.TILES_BASE = __tilesBase;
}

export function getTileCount(tilesetIndex) {
  const idx = clampIndex(tilesetIndex, TILESETS.length);
  return TILESETS[idx].count | 0;
}

export function getTileFolder(tilesetIndex) {
  const idx = clampIndex(tilesetIndex, TILESETS.length);
  return __tilesBase + TILESETS[idx].folder + '/';
}

export function buildTileUrl(tilesetIndex, id) {
  const folder = getTileFolder(tilesetIndex);
  const n = (id | 0).toString().padStart(2, '0');
  return folder + `tile-${n}.png`;
}

// Simple per-tileset cache (promise of Image[])
const __tileCache = new Map();

export function clearTileCache(tilesetIndex) {
  __tileCache.delete(String(tilesetIndex | 0));
}

// Load tiles for a tileset, automatically grabbing any extra images that exist
// beyond the expected count. This lets tilesets expose more tiles than the
// metadata might claim (for example the Urban and Rocky Mountains sets).

export async function loadAllTiles(tilesetIndex, count = getTileCount(tilesetIndex)) {
  const key = String(tilesetIndex | 0);
  if (__tileCache.has(key)) return __tileCache.get(key);

  const p = (async () => {
    const images = [];

    const isPlaceholder = (img) => (img && img.width === 1 && img.height === 1);

    // helper to load a single tile image, resolving with a placeholder on error
    const loadOne = (idx) => new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => {
        const fail = new Image();
        fail.width = 1; fail.height = 1;
        resolve(fail);
      };
      img.src = buildTileUrl(tilesetIndex, idx);
    });

    // Load the expected range first (0..count-1)
    for (let i = 0; i < count; i++) {
      images[i] = await loadOne(i);
    }

    // Probe for extras but DON'T stop at the first gap.
    // Keep going until we hit a run of consecutive misses.
    const MAX_PROBE = 96;           // hard safety cap
    const MAX_CONSECUTIVE_MISSES = 8;
    let consecutiveMisses = 0;
    for (let i = count; i < MAX_PROBE; i++) {
      const img = await loadOne(i);
      images[i] = img;
      if (isPlaceholder(img)) {
        consecutiveMisses++;
        if (consecutiveMisses >= MAX_CONSECUTIVE_MISSES) break;
      } else {
        consecutiveMisses = 0; // reset when we find a valid tile
      }
    }

    return images;
  })();

  __tileCache.set(key, p);
  return p;
}
