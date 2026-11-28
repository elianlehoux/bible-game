import * as THREE from 'three';

const cache = new Map<string, THREE.MeshStandardMaterial>();

/** Material low poly (sombreado plano). Se reutiliza por color y opciones para ahorrar draw calls. */
export function mat(color: string, opts: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  const key = color + JSON.stringify(opts);
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.84, metalness: 0, flatShading: true, ...opts });
    cache.set(key, m);
  }
  return m;
}

export function mesh(geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z);
  me.castShadow = true;
  me.receiveShadow = true;
  return me;
}

export const BRONZE = mat('#b9873b', { metalness: 0.55, roughness: 0.38 });

/** Textura de punto suave para partículas y brillos. */
export function softDot(size = 32, inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,.6)'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, inner);
  gr.addColorStop(0.4, mid);
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
