import * as THREE from 'three';
import { mat, mesh } from '../util/materials';
import { rand, lerpAngle } from '../util/math';
import { H } from '../world/terrain';
import type { Point } from '../world/layout';

export interface Sheep { g: THREE.Group; home: Point; tx: number; tz: number; wait: number }

const WOOL = mat('#f1ece0', { roughness: 1 });
const DARK = mat('#2e2924');
const BODY = new THREE.IcosahedronGeometry(0.5, 1);
const HEAD = new THREE.IcosahedronGeometry(0.22, 0);
const LEG = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 4);

export function createSheep(scene: THREE.Scene, x: number, z: number): Sheep {
  const g = new THREE.Group();
  const b = mesh(BODY, WOOL, 0, 0.72, 0);
  b.scale.set(0.95, 0.85, 1.3);
  g.add(b, mesh(HEAD, DARK, 0, 0.9, 0.68));
  for (const [lx, lz] of [[-0.22, -0.35], [0.22, -0.35], [-0.22, 0.35], [0.22, 0.35]]) g.add(mesh(LEG, DARK, lx, 0.25, lz));
  g.position.set(x, H(x, z), z);
  scene.add(g);
  return { g, home: { x, z }, tx: x, tz: z, wait: rand() * 3 };
}

/** Pastan: caminan despacio hacia un punto cercano a su lugar y esperan. */
export function updateSheep(s: Sheep, dt: number, t: number): void {
  const p = s.g.position, dx = s.tx - p.x, dz = s.tz - p.z, d = Math.hypot(dx, dz);
  if (d < 0.2) {
    s.wait -= dt;
    if (s.wait < 0) {
      s.tx = s.home.x + (rand() - 0.5) * 9;
      s.tz = s.home.z + (rand() - 0.5) * 7;
      s.wait = 2 + rand() * 4;
    }
  } else {
    const v = Math.min(d, dt * 0.9);
    p.x += (dx / d) * v;
    p.z += (dz / d) * v;
    s.g.rotation.y = lerpAngle(s.g.rotation.y, Math.atan2(dx, dz), 0.08);
  }
  p.y = H(p.x, p.z) + Math.abs(Math.sin(t * 6 + s.home.x)) * (d > 0.2 ? 0.05 : 0);
}
