// tileset.js — robust tile set utilities for WZ Map Maker
//
// Provides helpers for listing available tilesets, building tile URLs and
// loading all tile images for a given set. The original implementation stopped
// after a fixed number of tiles (usually 78), which meant tiles with higher
// indices (80 or 81) were never shown in the palette.  This version probes
// beyond the declared count and updates the tileset's count after loading so
// that every available tile is displayed.

export const TILESETS = [
  { name: 'Arizona',         folder: 'tertilesc1hw-128', count: 78 },
  { name: 'Urban',           folder: 'tertilesc2hw-128', count: 81 },
  { name: 'Rocky Mountains', folder: 'tertilesc3hw-128', count: 80 },
];

// ---------------------------------------------------------------------------
// Basic helpers

export function getTileCount(tilesetIndex) {
  const i = Math.max(0, Math.min(TILESETS.length - 1, tilesetIndex | 0));
  return TILESETS[i].count | 0;
}

export function getTileFolder(tilesetIndex) {
  const i = Math.max(0, Math.min(TILESETS.length - 1, tilesetIndex | 0));
  return TILESETS[i].folder;
}

export function buildTileUrl(tilesetIndex, idx, base = 'classic/texpages/') {
  const folder = getTileFolder(tilesetIndex);
  return `${base}${folder}/tile-${idx}.png`;
}

// ---------------------------------------------------------------------------
// Tile loading

const cache = new Map(); // Map<string, Promise<Image[]>>

export async function loadAllTiles(tilesetIndex) {
  const key = String(tilesetIndex | 0);
  if (cache.has(key)) return cache.get(key);

  const promise = (async () => {
    const images = [];
    const folder = getTileFolder(tilesetIndex);

    const loadImage = (url) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });

    // Step 1: load declared range
    const initial = getTileCount(tilesetIndex);
    for (let i = 0; i < initial; i++) {
      const url = buildTileUrl(tilesetIndex, i);
      const img = await loadImage(url); // eslint-disable-line no-await-in-loop
      if (img) images[i] = img;
    }

    // Step 2: probe beyond declared count until several misses are found
    const MAX_SAFE_INDEX = 96;            // classic sets never exceed this
    const MAX_CONSECUTIVE_MISSES = 8;     // stop after this many misses
    let idx = initial;
    let misses = 0;
    while (idx <= MAX_SAFE_INDEX && misses < MAX_CONSECUTIVE_MISSES) {
      const url = buildTileUrl(tilesetIndex, idx);
      // eslint-disable-next-line no-await-in-loop
      const img = await loadImage(url);
      if (img) {
        images[idx] = img;
        misses = 0;
      } else {
        misses++;
      }
      idx++;
    }

    // Compact array and update stored count so getTileCount reflects reality
    const out = images.filter(Boolean);
    TILESETS[tilesetIndex].count = out.length;
    return out;
  })();

  cache.set(key, promise);
  return promise;
}