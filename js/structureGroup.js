import * as THREE from "./three.module.js";
import { loadPieGeometry } from "./pie.js";
import { STRUCTURE_TURRETS } from "./structure_turrets.js";
import { getSensorModels } from "./sensors.js";

export async function buildStructureGroup(def, rotation, sizeX, sizeY, scaleOverride = null, opacityOverride = null) {
  const baseW = sizeX || 1;
  const baseD = sizeY || 1;
  const baseH = 0.6;
  const topW = baseW * 0.6;
  const topD = baseD * 0.6;
  const topH = baseH * 0.5;
  const group = new THREE.Group();
  const baseMat = new THREE.MeshLambertMaterial({
    color: 0x8888ff,
    transparent: opacityOverride !== null,
    opacity: opacityOverride !== null ? opacityOverride : 1
  });
  const topMat = new THREE.MeshLambertMaterial({
    color: 0xa0a0a0,
    transparent: opacityOverride !== null,
    opacity: opacityOverride !== null ? opacityOverride : 1
  });
  const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH, baseD), baseMat);
  baseMesh.position.set(0, baseH / 2, 0);
  const topMesh = new THREE.Mesh(new THREE.BoxGeometry(topW, topH, topD), topMat);
  topMesh.position.set(0, baseH + topH / 2, 0);
  group.add(baseMesh);
  group.add(topMesh);
  let attachments = STRUCTURE_TURRETS[def.id];
  const sensorModels = getSensorModels(def.sensorID);
  if (sensorModels.length) {
    attachments = sensorModels;
  }
  if (attachments && attachments.length) {
    const turretIdx = attachments.length > 1 ? 1 : 0;
    const turretGeo = await loadPieGeometry(attachments[turretIdx]).then(g => g.clone());
    turretGeo.computeBoundingBox();
    const tb = turretGeo.boundingBox;
    const tWidth = tb.max.x - tb.min.x || 1;
    const tDepth = tb.max.z - tb.min.z || 1;
    const scale = scaleOverride !== null ? scaleOverride : Math.min(topW / tWidth, topD / tDepth);
    turretGeo.scale(scale, scale, scale);
    turretGeo.computeBoundingBox();
    const tb2 = turretGeo.boundingBox;
    const tcX = (tb2.min.x + tb2.max.x) / 2;
    const tcZ = (tb2.min.z + tb2.max.z) / 2;
    const tMinY = tb2.min.y;
    let tMat;
    if (turretGeo.userData && turretGeo.userData.textureName) {
      const texLoader = new THREE.TextureLoader();
      const texName = turretGeo.userData.textureName.toLowerCase();
      const tex = texLoader.load(((typeof window!=='undefined'&&window.TEX_BASE)?window.TEX_BASE:TEX_BASE) + texName, undefined, undefined, () => {});
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.LinearMipMapLinearFilter;
      tMat = new THREE.MeshLambertMaterial({ map: tex, transparent: opacityOverride !== null, opacity: opacityOverride !== null ? opacityOverride : 1 });
    } else {
      tMat = new THREE.MeshLambertMaterial({ color: 0xff0000, transparent: opacityOverride !== null, opacity: opacityOverride !== null ? opacityOverride : 1 });
    }
    const tMesh = new THREE.Mesh(turretGeo, tMat);
    tMesh.position.set(-tcX, baseH + topH - tMinY, -tcZ);
    group.add(tMesh);
    if (attachments.length > 1) {
      const gunGeo = await loadPieGeometry(attachments[0]).then(g => g.clone());
      gunGeo.scale(scale, scale, scale);
      gunGeo.computeBoundingBox();
      const gb = gunGeo.boundingBox;
      const gcX = (gb.min.x + gb.max.x) / 2;
      const gcZ = (gb.min.z + gb.max.z) / 2;
      const gunBottom = gb.min.y;
      let gMat;
      if (gunGeo.userData && gunGeo.userData.textureName) {
        const texLoader2 = new THREE.TextureLoader();
        const texName2 = gunGeo.userData.textureName.toLowerCase();
        const tex2 = texLoader2.load(((typeof window!=='undefined'&&window.TEX_BASE)?window.TEX_BASE:TEX_BASE) + texName2, undefined, undefined, () => {});
        tex2.magFilter = THREE.NearestFilter;
        tex2.minFilter = THREE.LinearMipMapLinearFilter;
        gMat = new THREE.MeshLambertMaterial({ map: tex2, transparent: opacityOverride !== null, opacity: opacityOverride !== null ? opacityOverride : 1 });
      } else {
        gMat = new THREE.MeshLambertMaterial({ color: 0xff0000, transparent: opacityOverride !== null, opacity: opacityOverride !== null ? opacityOverride : 1 });
      }
      const gMesh = new THREE.Mesh(gunGeo, gMat);
      gMesh.position.set(-gcX, -gunBottom, -gcZ);
      tMesh.add(gMesh);
    }
    }
    group.rotation.y = -rotation * Math.PI / 2;
    group.updateMatrixWorld(true);
  let bbox = new THREE.Box3().setFromObject(group);
  const minY = bbox.min.y;
  group.userData.minY = minY;
  if (minY !== 0) {
    group.position.y -= minY;
    group.updateMatrixWorld(true);
    bbox = new THREE.Box3().setFromObject(group);
  }
  const center = bbox.getCenter(new THREE.Vector3());
  group.userData.centerX = center.x;
  group.userData.centerY = center.y;
  group.userData.centerZ = center.z;
  const __sphere = new THREE.Sphere();
  bbox.getBoundingSphere(__sphere);
  group.userData.boundingSphere = __sphere;
  group.userData.cullable = true;
  group.userData.structureId = def.id;
  return group;
}
