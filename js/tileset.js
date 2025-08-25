// Tileset definitions include their respective tile counts so that
// palettes can display every available tile. Some classic tilesets
// provide more than 78 tiles (up to 81), and the previous hard-coded
// limit caused the last few tiles to be omitted from the UI.
export const TILESETS = [
  { name: "Arizona", folder: "tertilesc1hw-128", count: 78 },
  { name: "Urban",   folder: "tertilesc2hw-128", count: 81 },
  { name: "Rocky",   folder: "tertilesc3hw-128", count: 80 }
];

export function getTileCount(index = 0) {
  const set = TILESETS[index] || TILESETS[0];
  return set.count;
}

function buildTileUrl(folder, index) {
  return `classic/texpages/${folder}/tile-${index}.png`;
}

export async function loadAllTiles(tilesetIndex) {
  const set = TILESETS[tilesetIndex];
  const total = set.count;
  const images = [];
  for (let i = 0; i < total; i++) {
    const url = buildTileUrl(set.folder, i);
    const img = await loadImage(url, i);
    images.push(img);
  }
  return images;
}

function loadImage(url, idx) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn("Missing tile", idx, url);
      resolve(createMissingTile());
    };
    img.src = url;
  });
}

function createMissingTile(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#400';