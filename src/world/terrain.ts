import * as THREE from 'three';
import { hash, vnoise, smooth, clamp } from '../util/math';

// El valle corre de norte a sur (eje Z). El arroyo serpentea cerca de x = 0:
// Israel acampa al oeste (x < 0) y los filisteos al este (x > 0).

export const WATER_Y = -0.35;

/** Posición x del centro del arroyo para una z dada. */
export const mx = (z: number): number => 2.2 * Math.sin(z * 0.07) + 0.8 * Math.sin(z * 0.19 + 1.3);

/** Altura del terreno. Se usa para la malla y para apoyar a los personajes. */
export function H(x: number, z: number): number {
  const sx = x - mx(z), sm = Math.exp(-(sx * sx) / 9);
  const hills = smooth(26, 70, Math.abs(x)) * 20 + smooth(36, 86, Math.abs(z)) * 16;
  const amp = 0.35 + smooth(12, 45, Math.abs(x)) * 2.2 + smooth(30, 70, Math.abs(z)) * 1.5;
  const n = (vnoise(x * 0.055, z * 0.055) - 0.5) * 2 * amp + (vnoise(x * 0.2 + 11, z * 0.2 - 5) - 0.5) * 0.5;
  return hills + n * (1 - sm * 0.85) - 1.6 * sm + 0.25;
}

export function inWater(x: number, z: number): boolean {
  return Math.abs(x - mx(z)) < 2.6;
}

const PATHS: [number, number][][] = [
  [[-40, 21], [-26, 7], [-16, 1.5], [-6, 1], [-2.5, 1]],
  [[3, 1], [8, 1], [22, 0], [36, -2]],
];

function distSeg(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}

export function distPath(x: number, z: number): number {
  let m = 1e9;
  for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) m = Math.min(m, distSeg(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  return m;
}

const PAL = {
  grassA: new THREE.Color('#8f9b4e'), grassB: new THREE.Color('#76863f'), dry: new THREE.Color('#b8a76a'),
  sand: new THREE.Color('#d9c48e'), wet: new THREE.Color('#a99a6c'), path: new THREE.Color('#bea172'),
  rock: new THREE.Color('#cbbfa2'), rockD: new THREE.Color('#a99d82'),
};

export function createTerrain(scene: THREE.Scene): void {
  const g = new THREE.PlaneGeometry(260, 200, 104, 80);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)));
  const tg = g.toNonIndexed();
  g.dispose();
  tg.computeVertexNormals();

  // Un color por triángulo: arena junto al arroyo, caminos, roca en las laderas y pasto que se seca con la altura.
  const tp = tg.attributes.position, cols = new Float32Array(tp.count * 3), c = new THREE.Color();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (let f = 0; f < tp.count; f += 3) {
    a.fromBufferAttribute(tp, f); b.fromBufferAttribute(tp, f + 1); d.fromBufferAttribute(tp, f + 2);
    const cx = (a.x + b.x + d.x) / 3, cy = (a.y + b.y + d.y) / 3, cz = (a.z + b.z + d.z) / 3;
    const n = e1.subVectors(b, a).cross(e2.subVectors(d, a)).normalize();
    const slope = 1 - Math.abs(n.y), sx = Math.abs(cx - mx(cz)), r = hash(f, 3);
    if (sx < 2.7 && cy < WATER_Y + 0.2) c.copy(PAL.wet);
    else if (sx < 4.8 && cy < 0.7) c.copy(PAL.sand);
    else if (distPath(cx, cz) < 1.5 && cy < 3) c.copy(PAL.path);
    else if (slope > 0.4 || cy > 9.5 + r * 2) c.copy(r < 0.5 ? PAL.rock : PAL.rockD);
    else {
      c.lerpColors(PAL.grassA, PAL.grassB, vnoise(cx * 0.09, cz * 0.09));
      c.lerp(PAL.dry, smooth(1.5, 9, cy) * 0.8);
    }
    c.offsetHSL(0, 0, (r - 0.5) * 0.045);
    for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3);
  }
  tg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.96 }));
  terrain.receiveShadow = true;
  scene.add(terrain);
}

export interface Water { update(t: number): void }

export function createWater(scene: THREE.Scene): Water {
  const g = new THREE.PlaneGeometry(7.5, 200, 6, 100);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { p.setX(i, p.getX(i) + mx(p.getZ(i))); p.setY(i, WATER_Y); }
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#4d93b6', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.8, flatShading: true }));
  m.receiveShadow = true;
  scene.add(m);
  return {
    update(t) {
      for (let i = 0; i < p.count; i++) p.setY(i, WATER_Y + Math.sin(t * 1.7 + p.getZ(i) * 0.45 + p.getX(i)) * 0.05);
      p.needsUpdate = true;
      g.computeVertexNormals();
    },
  };
}
