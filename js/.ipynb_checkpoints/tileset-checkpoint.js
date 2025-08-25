export const TILESETS = [
  { name: "Arizona", folder: "tertilesc1hw-128" },
  { name: "Urban",   folder: "tertilesc2hw-128" },
  { name: "Rocky",   folder: "tertilesc3hw-128" }
];

const TOTAL_TILES = 81;

function buildTileUrl(folder, index) {
  return `classic/texpages/${folder}/tile-${index}.png`;
}

export async function loadAllTiles(tilesetIndex) {
  const set = TILESETS[tilesetIndex];
  const images = [];
  for (let i = 0; i < TOTAL_TILES; i++) {
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
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#f00';
  ctx.lineWidth = size / 10;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, size);
  ctx.moveTo(size, 0);
  ctx.lineTo(0, size);
  ctx.stroke();
  const img = new Image();
  img.src = canvas.toDataURL();
  return img;
}