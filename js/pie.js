import * as THREE from "./three.module.js";
const pieCache = {};
export function parsePie(data) {
  const lines = data.split(/\r?\n/);
  let i = 0;
  const points = [];
  const triIndices = [];
  const triUVs = [];
  let textureName = null;
  let texWidth = 256;
  let texHeight = 256;
  const connectors = [];
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith('TEXTURE')) {
      const parts = line.split(/\s+/);
      textureName = parts[2] || null;
      if (parts.length >= 5) {
        texWidth = parseInt(parts[3], 10) || 256;
        texHeight = parseInt(parts[4], 10) || 256;
      }
    } else if (line.startsWith('POINTS')) {
      const parts = line.split(/\s+/);
      const count = parseInt(parts[1], 10);
      for (let j = 0; j < count; j++) {
        i++;
        const coords = lines[i].trim().split(/\s+/).map(parseFloat);
        points.push([coords[0] / 128, coords[1] / 128, coords[2] / 128]);
      }
    } else if (line.startsWith('POLYGONS')) {
      const count = parseInt(line.split(/\s+/)[1], 10);
      for (let j = 0; j < count; j++) {
        i++;
        const nums = lines[i].trim().split(/\s+/).map(Number);
        if (nums.length < 3) continue;
        const vertCount = nums[1];
        const startIdx = 2;
        const indices = nums.slice(startIdx, startIdx + vertCount);
        const uvStart = startIdx + vertCount;
        const uvPairs = nums.slice(uvStart);
        for (let k = 1; k < vertCount - 1; k++) {
          const a = indices[0];
          const b = indices[k];
          const c = indices[k + 1];
          triIndices.push([a, b, c]);
          const uvA = [uvPairs[0], uvPairs[1]];
          const uvB = [uvPairs[2 * k], uvPairs[2 * k + 1]];
          const uvC = [uvPairs[2 * (k + 1)], uvPairs[2 * (k + 1) + 1]];
          triUVs.push([uvA, uvB, uvC]);
        }
      }
    } else if (line.startsWith('CONNECTORS')) {
      const parts = line.split(/\s+/);
      const count = parseInt(parts[1], 10) || 0;
      for (let j = 0; j < count; j++) {
        i++;
        const vals = lines[i].trim().split(/\s+/).map(Number);
        if (vals.length >= 3) {
          const cx = vals[0] / 128;
          const cy = vals[2] / 128;
          const cz = vals[1] / 128;
          connectors.push({ x: cx, y: cy, z: cz });
        }
      }
    }
    i++;
  }
  const positions = [];
  const uvs = [];
  triIndices.forEach((face, idx) => {
    const uvSet = triUVs[idx];
    for (let j = 0; j < 3; j++) {
      const p = points[face[j]];
      positions.push(p[0], p[1], p[2]);
      const uv = uvSet[j];
      const u = (uv[0] / texWidth);
      const v = 1 - (uv[1] / texHeight);
      uvs.push(u, v);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (uvs.length > 0) {
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (textureName) geo.userData.textureName = textureName;
  }
  if (connectors.length) {
    geo.userData.connectors = connectors;
  }
  geo.computeVertexNormals();
  return geo;
}
export function loadPieGeometry(filename) {
  if (!filename) return Promise.reject(new Error('No file'));
  const key = filename.toLowerCase();
  if (pieCache[key]) {
    return Promise.resolve(pieCache[key]);
  }
  return fetch(((typeof window!=='undefined'&&window.PIES_BASE)?window.PIES_BASE:'pies/') + filename.toLowerCase()).then(res => {
    if (!res.ok) throw new Error('Failed to load ' + filename);
    return res.text();
  }).then(text => {
    const geo = parsePie(text);
    pieCache[key] = geo;
    return geo;
  });
}
