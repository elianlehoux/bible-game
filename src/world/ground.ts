import * as THREE from 'three';
import { hash } from '../util/math';
import type { SunRig } from './sky';

// Piezas comunes a todos los mapas: la altura del suelo, la malla del terreno y la interfaz World.

export interface Point { x: number; z: number }
export interface Collider extends Point { r: number }
export type HeightFn = (x: number, z: number) => number;

let current: HeightFn = () => 0;

/**
 * Altura del suelo del mapa activo. Personajes, honda y efectos la usan para apoyarse.
 * Cada mapa registra la suya con setGround() al activarse.
 */
export const H: HeightFn = (x, z) => current(x, z);

export function setGround(fn: HeightFn): void { current = fn; }

/** Un mapa ya construido: su escena, el suelo y los obstáculos fijos. */
export interface World {
  scene: THREE.Scene;
  height: HeightFn;
  colliders: Collider[];
  sun: SunRig;
  /** Devuelve la posición dentro del área caminable. */
  clamp(x: number, z: number): [number, number];
  /** Velocidad relativa en ese punto (1 = normal; el agua, por ejemplo, frena). */
  speedAt?(x: number, z: number): number;
  update(t: number): void;
}

export interface TerrainOpts {
  width: number;
  depth: number;
  cx?: number;
  cz?: number;
  /** Metros por celda, aproximado. */
  cell?: number;
  height: HeightFn;
  /** Color de cada triángulo según su centro, su pendiente (0 plano, 1 vertical) y un número al azar estable. */
  color(out: THREE.Color, x: number, y: number, z: number, slope: number, r: number): void;
}

/** Malla de terreno low poly con un color por triángulo. */
export function createTerrainMesh(scene: THREE.Scene, o: TerrainOpts): THREE.Mesh {
  const cell = o.cell ?? 2.5;
  const g = new THREE.PlaneGeometry(o.width, o.depth, Math.round(o.width / cell), Math.round(o.depth / cell));
  g.rotateX(-Math.PI / 2);
  g.translate(o.cx ?? 0, 0, o.cz ?? 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, o.height(p.getX(i), p.getZ(i)));
  const tg = g.toNonIndexed();
  g.dispose();
  tg.computeVertexNormals();

  const tp = tg.attributes.position, cols = new Float32Array(tp.count * 3), c = new THREE.Color();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (let f = 0; f < tp.count; f += 3) {
    a.fromBufferAttribute(tp, f); b.fromBufferAttribute(tp, f + 1); d.fromBufferAttribute(tp, f + 2);
    const n = e1.subVectors(b, a).cross(e2.subVectors(d, a)).normalize();
    const r = hash(f, 3);
    o.color(c, (a.x + b.x + d.x) / 3, (a.y + b.y + d.y) / 3, (a.z + b.z + d.z) / 3, 1 - Math.abs(n.y), r);
    c.offsetHSL(0, 0, (r - 0.5) * 0.045);
    for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3);
  }
  tg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.96 }));
  terrain.receiveShadow = true;
  scene.add(terrain);
  return terrain;
}

export interface Water { update(t: number): void }

/** Superficie de agua animada sobre una geometría plana ya ubicada (en el plano XZ). */
export function createWaterMesh(scene: THREE.Scene, g: THREE.BufferGeometry, y: number): Water {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, y);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#4d93b6', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.82, flatShading: true }));
  m.receiveShadow = true;
  scene.add(m);
  return {
    update(t) {
      for (let i = 0; i < p.count; i++) p.setY(i, y + Math.sin(t * 1.7 + p.getZ(i) * 0.45 + p.getX(i) * 0.6) * 0.05);
      p.needsUpdate = true;
      g.computeVertexNormals();
    },
  };
}

/** Libera la memoria de GPU de una escena que ya no se usa. */
export function disposeScene(scene: THREE.Scene): void {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
  });
  scene.clear();
}

/** Mantiene un punto dentro de una elipse centrada en (cx, cz). */
export function clampEllipse(x: number, z: number, rx: number, rz: number, cx = 0, cz = 0): [number, number] {
  const dx = x - cx, dz = z - cz, e = Math.hypot(dx / rx, dz / rz);
  return e > 1 ? [cx + dx / e, cz + dz / e] : [x, z];
}
