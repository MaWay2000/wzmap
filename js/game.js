// patched game.js (only tileset loading logic changed)
import { TILESETS, loadAllTiles } from './tileset.js';

const tilesetSelect = document.getElementById('tilesetSelect');
const texturePalette = document.getElementById('texturePalette');

let currentPaletteRequest = 0;

async function refreshPalette(idx) {
  const requestId = ++currentPaletteRequest;
  texturePalette.innerHTML = "";
  const images = await loadAllTiles(idx);
  // If another tileset change happened while we were loading,
  // abort updating the palette to avoid mismatched tiles.
  if (requestId !== currentPaletteRequest) return;
  images.forEach((img, i) => {
    const div = document.createElement("div");
    div.style.width = "32px";
    div.style.height = "32px";
    div.style.backgroundImage = `url(${img.src})`;
    div.style.backgroundSize = "cover";
    div.title = `Tile ${i}`;
    div.dataset.tileId = i;
    texturePalette.appendChild(div);
  });
}

tilesetSelect.addEventListener('change', (e) => {
  const idx = parseInt(e.target.value, 10) || 0;
  refreshPalette(idx);
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  TILESETS.forEach((ts, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = ts.name;
    tilesetSelect.appendChild(opt);
  });
  refreshPalette(0);
});
