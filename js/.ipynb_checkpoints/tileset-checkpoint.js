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

export async function loadAllTiles(tilesetIndex, count = getTileCount(tilesetIndex)) {
  const key = String(tilesetIndex | 0) + ':' + (count | 0);
  if (__tileCache.has(key)) return __tileCache.get(key);

  const p = new Promise((resolve) => {
    const images = new Array(count);
    let done = 0;

    function finish() { if (done >= count) resolve(images); }

    for (let i = 0; i < count; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = buildTileUrl(tilesetIndex, i);

      img.onload = () => { images[i] = img; done++; finish(); };
      img.onerror = () => {
        // keep spot with a transparent 1x1 if fetch fails
        const fail = new Image();
        fail.width = 1; fail.height = 1;
        images[i] = fail; done++; finish();
      };
    }
  });

  __tileCache.set(key, p);
  return p;
}
