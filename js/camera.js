// camera.js

export const cameraState = {
  camTargetX: 0,
  camTargetZ: 0,
  rotationY: Math.PI / 4,
  rotationX: -1.1,
  zoom: 0.8,
  camMoveSpeed: 5,
  keys: {}
};

export function resetCameraTarget(mapW, mapH, container) {
  cameraState.camTargetX = (mapW / 2 - 0.5);
  cameraState.camTargetZ = (mapH / 2 - 0.5);
  cameraState.rotationY = Math.PI / 4;
  cameraState.rotationX = -1.1;
  const aspect = container.offsetWidth / container.offsetHeight;
  const margin = 1.1;
  let zoomX = (mapW / 64) * margin;
  let zoomZ = (mapH / (64 * aspect)) * margin;
  cameraState.zoom = Math.max(zoomX, zoomZ);
}

export function setupKeyboard(resetCallback) {
  window.addEventListener('keydown', e => {
    cameraState.keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'r') resetCallback();
  });
  window.addEventListener('keyup', e => { cameraState.keys[e.key.toLowerCase()] = false; });
}
