// tileset.js — robust tile set utilities for WZ Map Maker
function normalizeTexPath(name){
  let n = String(name || '').replace(/\\/g,'/').toLowerCase();
  n = n.replace(/^\.+\//, '');
  n = n.replace(/^(images|texpages)\//, '');
  n = n.replace(/^classic\/texpages\//, '');
  n = n.replace(/texpages\/texpages\//g, 'texpages/');
  return n;
}

// Exports: TILESETS, setTilesBase, getTileCount, getTileFolder,
//          buildTileUrl, loadAllTiles, clearTileCache
//
// If a tileset folder only has 78 images, we can’t conjure the rest.
// By default this loader grabs exactly the declared range of tiles
// and looks only in the configured base folder.

export const TILESETS = [
  // Direct mapping of tileset folders to display names
  { name: 'arizona',         folder: 'tertilesc1hw-128', count: 78 },
  { name: 'urban',           folder: 'tertilesc2hw-128', count: 81 },
  { name: 'rocky mountains', folder: 'tertilesc3hw-128', count: 80 },
];

let __tilesBase = (typeof window !== 'undefined' && window.TILES_BASE)
  ? window.TILES_BASE
  : 'classic/texpages/';

// Configure the single base directory used for tile loading.
export function setTilesBase(path){
  __tilesBase = String(path || '');
}

export function getTileFolder(tilesetIndex){
  const i = Math.max(0, Math.min(TILESETS.length - 1, tilesetIndex|0));
  return TILESETS[i].folder;
}

export function getTileCount(tilesetIndex){
  const i = Math.max(0, Math.min(TILESETS.length - 1, tilesetIndex|0));
  return TILESETS[i].count|0;
}

export function buildTileUrl(tilesetIndex, idx, baseOverride){
  const folder = getTileFolder(tilesetIndex);
  const base = baseOverride || __tilesBase;
  const max = getTileCount(tilesetIndex) - 1;
  const clamped = Math.max(0, Math.min(max, idx|0));
  const p2 = String(clamped).padStart(2, '0');
  return `${base}${folder}/tile-${p2}.png`;
}

// Simple per-tileset cache (Promise<Image[]>)
const __tileCache = new Map();
export function clearTileCache(tilesetIndex){
  if (typeof tilesetIndex === 'number') __tileCache.delete(String(tilesetIndex|0));
  else __tileCache.clear();
}

// Core loader. It will:
// 1) Attempt declared count (0..count-1).
// 2) Optionally probe indices past the declared range (up to MAX_SAFE_INDEX).
// 3) Try lowercase/uppercase filenames before giving up a given index.
export async function loadAllTiles(tilesetIndex, count = getTileCount(tilesetIndex), includeExtras = false){
  // Set includeExtras=false to load exactly `count` tiles without probing past gaps.
  const key = String(tilesetIndex|0);
  if (__tileCache.has(key)) return __tileCache.get(key);

  const p = (async () => {
    const folder = getTileFolder(tilesetIndex);

    const loadOne = (idx) => new Promise((resolve) => {
      const p2 = String(idx).padStart(2, '0');
      const candidates = [
        `tile-${p2}.png`, `tile-${p2}.PNG`,
        `tile-${idx}.png`, `tile-${idx}.PNG`,
      ];
      let ni = 0;
      const tryNext = () => {
        if (ni >= candidates.length) {
          // not found anywhere: resolve to a 1x1 marker image
          const img = new Image(); img.width = 1; img.height = 1; resolve(img); return;
        }
        const name = candidates[ni];
        const url = `${__tilesBase}${folder}/${name}`;
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = () => { ni += 1; tryNext(); };
        img.src = url;
      };
      tryNext();
    });

    const imgs = [];
    const pushIfReal = (img, idx) => {
      if (img && !(img.width === 1 && img.height === 1)) {
        imgs[idx] = img;
        return true;
      }
      return false;
    };

    // Step 1: load declared range
    const tasks1 = [];
    for (let i = 0; i < count; i++) {
      tasks1.push(loadOne(i).then(img => pushIfReal(img, i)));
    }
    await Promise.all(tasks1);

    // Step 2: probe past gaps
    const MAX_SAFE_INDEX = 96;
    let idx = count;
    if (includeExtras) {
      const MAX_CONSECUTIVE_MISSES = 8;
      let misses = 0;
      while (idx <= MAX_SAFE_INDEX && misses < MAX_CONSECUTIVE_MISSES) {
        if (imgs[idx]) { idx++; misses = 0; continue; }
        /* eslint no-await-in-loop: "off" */
        const ok = pushIfReal(await loadOne(idx), idx);
        misses = ok ? 0 : (misses + 1);
        idx++;
      }
    }

    // Pack dense array
    const last = imgs.reduceRight((p, v, i) => (p >= 0 ? p : (v ? i : -1)), -1);
    const out = [];
    for (let i = 0; i <= last; i++) if (imgs[i]) out.push(imgs[i]);

    try {
      console.log(`[tileset] ${folder} -> loaded ${out.length} tiles (requested 0..${Math.min(idx-1, MAX_SAFE_INDEX)})`);
    } catch {}
    return out;
  })();

  __tileCache.set(key, p);
  return p;
}
