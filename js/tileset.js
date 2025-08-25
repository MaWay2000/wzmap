// patched tileset.js
export const TILESETS = [
  { name: "Arizona", folder: "tertilesc1hw-128", max: 78 },
  { name: "Urban",   folder: "tertilesc2hw-128", max: 81 },
  { name: "Rocky",   folder: "tertilesc3hw-128", max: 80 }
];

function buildTileUrl(folder, index) {
  return `classic/texpages/${folder}/tile-${index}.png`;
}

export async function loadAllTiles(tilesetIndex) {
  const set = TILESETS[tilesetIndex];
  const images = [];
  for (let i = 0; i < set.max; i++) {
    const url = buildTileUrl(set.folder, i);
    try {
      const img = await loadImage(url);
      images.push(img);
    } catch (e) {
      console.warn("Missing tile", i, url);
    }
  }
  return images;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
