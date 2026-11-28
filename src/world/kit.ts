import * as THREE from 'three';
import { H, type Collider, type Point } from './ground';
import { mat, mesh } from '../util/materials';
import { rand } from '../util/math';

// Piezas de escenario que comparten los mapas: árboles, rocas, pasto, carpas, casas, muros y fogatas.
// Lo repetido va en InstancedMesh para que el teléfono dibuje pocas cosas por cuadro.

const dummy = new THREE.Object3D();
const pick = <T>(a: T[]): T => a[(rand() * a.length) | 0];

export interface Spot extends Point { s: number }

/** Busca puntos al azar que cumplan una condición y estén separados entre sí. */
export function scatter(max: number, tries: number, gen: () => [number, number], ok: (x: number, z: number) => boolean, minDist = 0, taken: Point[] = []): Spot[] {
  const out: Spot[] = [];
  for (let i = 0; i < tries && out.length < max; i++) {
    const [x, z] = gen();
    if (!ok(x, z)) continue;
    if (minDist && (out.some((p) => Math.hypot(p.x - x, p.z - z) < minDist) || taken.some((p) => Math.hypot(p.x - x, p.z - z) < minDist))) continue;
    out.push({ x, z, s: 1 });
  }
  return out;
}

const LEAF = ['#5b7a37', '#6b8a40', '#7d9752', '#8a9d6e'];
const OLIVE = ['#7d8c62', '#8d9a73', '#6f7f58', '#97a283'];

/** Árboles low poly: tronco y tres copas. `olive` da el verde grisáceo de los olivos. */
export function trees(scene: THREE.Scene, list: Spot[], colliders: Collider[], olive = false): void {
  if (!list.length) return;
  const trunkG = new THREE.CylinderGeometry(0.2, 0.36, 2.3, 6);
  trunkG.translate(0, 1.15, 0);
  const trunks = new THREE.InstancedMesh(trunkG, mat('#6a4a30'), list.length);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.45, 0), mat('#ffffff'), list.length * 3);
  const leaf = (olive ? OLIVE : LEAF).map((c) => new THREE.Color(c));
  list.forEach((t, i) => {
    const y = H(t.x, t.z) - 0.1;
    dummy.position.set(t.x, y, t.z);
    dummy.rotation.set(0, rand() * 6, (rand() - 0.5) * 0.2);
    dummy.scale.setScalar(t.s);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + rand(), r = k === 0 ? 0 : 0.95;
      dummy.position.set(t.x + Math.cos(a) * r * t.s, y + (2.4 + (k === 0 ? 0.55 : 0) + rand() * 0.3) * t.s, t.z + Math.sin(a) * r * t.s);
      dummy.rotation.set(rand() * 3, rand() * 3, 0);
      const sc = (k === 0 ? 1.1 : 0.85) * t.s;
      dummy.scale.set(sc * 1.25, sc * (olive ? 0.65 : 0.8), sc * 1.25);
      dummy.updateMatrix();
      crowns.setMatrixAt(i * 3 + k, dummy.matrix);
      crowns.setColorAt(i * 3 + k, pick(leaf));
    }
    colliders.push({ x: t.x, z: t.z, r: 0.55 * t.s });
  });
  for (const m of [trunks, crowns]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }
}

/** Rocas de piedra caliza. Las grandes (s > 0.7) bloquean el paso. */
export function rocks(scene: THREE.Scene, list: Spot[], colliders: Collider[]): void {
  if (!list.length) return;
  const m = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), mat('#ffffff', { roughness: 0.95 }), list.length);
  const cols = ['#cfc3a7', '#b9ad92', '#a49a84', '#d8cfb8'].map((c) => new THREE.Color(c));
  list.forEach((r, i) => {
    dummy.position.set(r.x, H(r.x, r.z) + r.s * 0.25, r.z);
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    dummy.scale.set(r.s * 1.2, r.s * 0.75, r.s);
    dummy.updateMatrix();
    m.setMatrixAt(i, dummy.matrix);
    m.setColorAt(i, pick(cols));
    if (r.s > 0.7) colliders.push({ x: r.x, z: r.z, r: r.s * 0.9 });
  });
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
}

/** Matorrales bajos (retama, espinos). No bloquean el paso. */
export function bushes(scene: THREE.Scene, list: Spot[]): void {
  if (!list.length) return;
  const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.7, 0), mat('#ffffff', { roughness: 1 }), list.length * 2);
  const cols = ['#6d7a3c', '#7f8a48', '#8c8a52', '#5f6d34'].map((c) => new THREE.Color(c));
  list.forEach((b, i) => {
    for (let k = 0; k < 2; k++) {
      dummy.position.set(b.x + (k ? 0.5 : -0.2) * b.s, H(b.x, b.z) + 0.35 * b.s, b.z + (k ? -0.3 : 0.2) * b.s);
      dummy.rotation.set(rand() * 3, rand() * 3, 0);
      dummy.scale.set(b.s * (1 + rand() * 0.3), b.s * 0.7, b.s);
      dummy.updateMatrix();
      m.setMatrixAt(i * 2 + k, dummy.matrix);
      m.setColorAt(i * 2 + k, pick(cols));
    }
  });
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
}

/** Pasto y anémonas rojas, la flor silvestre típica de la región. */
export function grass(scene: THREE.Scene, n: number, area: { cx: number; cz: number; rx: number; rz: number }, ok: (x: number, z: number, y: number) => boolean, flowersN = 180): void {
  const tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.55, 3).translate(0, 0.27, 0), mat('#ffffff'), n);
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), mat('#ffffff', { roughness: 0.6 }), flowersN);
  const grassCols = ['#7f8f45', '#93a14f', '#a9a564', '#6f803b'].map((c) => new THREE.Color(c));
  const flowerCols = ['#d23a30', '#d23a30', '#e8e2d6', '#c94a9a'].map((c) => new THREE.Color(c));
  let t = 0, f = 0;
  for (let i = 0; i < n * 4 && (t < n || f < flowersN); i++) {
    const x = area.cx + (rand() * 2 - 1) * area.rx, z = area.cz + (rand() * 2 - 1) * area.rz, y = H(x, z);
    if (!ok(x, z, y)) continue;
    if (t < n) {
      dummy.position.set(x, y - 0.05, z);
      dummy.rotation.set((rand() - 0.5) * 0.5, rand() * 3, (rand() - 0.5) * 0.5);
      dummy.scale.setScalar(0.7 + rand() * 0.8);
      dummy.updateMatrix();
      tufts.setMatrixAt(t, dummy.matrix);
      tufts.setColorAt(t, pick(grassCols));
      t++;
    }
    if (f < flowersN && rand() < 0.2) {
      dummy.position.set(x + 0.3, y + 0.2, z + 0.2);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 0.5, 1);
      dummy.updateMatrix();
      flowers.setMatrixAt(f, dummy.matrix);
      flowers.setColorAt(f, pick(flowerCols));
      f++;
    }
  }
  tufts.count = t;
  flowers.count = f;
  tufts.receiveShadow = true;
  scene.add(tufts, flowers);
}

/** Banderas que flamean. */
export class Flags {
  private list: { geo: THREE.BufferGeometry; base: Float32Array; seed: number }[] = [];

  add(parent: THREE.Object3D, x: number, y: number, z: number, color: string): void {
    const g = new THREE.PlaneGeometry(1.3, 0.75, 8, 1);
    g.translate(0.65, 0, 0);
    const f = new THREE.Mesh(g, mat(color, { side: THREE.DoubleSide }));
    f.position.set(x, y, z);
    f.castShadow = true;
    parent.add(f);
    this.list.push({ geo: g, base: Float32Array.from(g.attributes.position.array as Float32Array), seed: rand() * 6 });
  }

  update(t: number): void {
    for (const fl of this.list) {
      const a = fl.geo.attributes.position;
      for (let i = 0; i < a.count; i++) a.setZ(i, Math.sin(t * 5 + fl.base[i * 3] * 3.5 + fl.seed) * 0.14 * fl.base[i * 3]);
      a.needsUpdate = true;
    }
  }
}

export type TentKind = 'goat' | 'cream' | 'royal' | 'red' | 'stripe';
export interface TentDef extends Point { rot: number; kind: TentKind }
const TENT_COLORS: Record<TentKind, string> = { goat: '#5b4838', cream: '#ddcda7', royal: '#6a3d85', red: '#a3412d', stripe: '#e3d0a6' };

/** Carpa a dos aguas: un prisma triangular con la cumbrera en y = h. */
function prismGeo(l: number, w: number, h: number): THREE.BufferGeometry {
  const v = [[-l, 0, -w], [l, 0, -w], [l, 0, w], [-l, 0, w], [-l, h, 0], [l, h, 0]];
  const idx = [0, 5, 1, 0, 4, 5, 3, 2, 5, 3, 5, 4, 0, 3, 4, 1, 5, 2];
  const pos = new Float32Array(idx.length * 3);
  idx.forEach((k, i) => pos.set(v[k], i * 3));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

const WOOD = mat('#4a3422');
const POLE = new THREE.CylinderGeometry(0.05, 0.05, 1, 5);

export function tents(scene: THREE.Scene, list: TentDef[], colliders: Collider[], flags: Flags): void {
  for (const t of list) {
    const big = t.kind === 'royal', l = big ? 3.2 : 2.3, w = big ? 2.3 : 1.7, h = big ? 3.2 : 2.4;
    const grp = new THREE.Group();
    grp.position.set(t.x, H(t.x, t.z) - 0.05, t.z);
    grp.rotation.y = t.rot;
    grp.add(mesh(prismGeo(l, w, h), mat(TENT_COLORS[t.kind])));
    const door = new THREE.BufferGeometry();
    door.setAttribute('position', new THREE.BufferAttribute(new Float32Array([l + 0.02, 0, -w * 0.38, l + 0.02, 0, w * 0.38, l + 0.02, h * 0.62, 0]), 3));
    door.computeVertexNormals();
    grp.add(new THREE.Mesh(door, mat('#2a2018', { side: THREE.DoubleSide })));
    for (const px of [-l - 0.05, l + 0.05]) grp.add(mesh(POLE, WOOD, px, h + 0.1, 0));
    if (big) {
      grp.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 5), WOOD, l + 0.05, h + 0.9, 0));
      flags.add(grp, l + 0.05, h + 1.6, 0, '#e2b445');
    } else if (t.kind === 'red' || t.kind === 'stripe') {
      grp.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 5), WOOD, l + 0.05, h + 0.7, 0));
      flags.add(grp, l + 0.05, h + 1.25, 0, '#b43a28');
    }
    scene.add(grp);
    colliders.push({ x: t.x, z: t.z, r: big ? 3.2 : 2.4 });
  }
}

/** Fogata con llama animada. Devuelve la función que la anima. */
export function fire(scene: THREE.Scene, p: Point, colliders: Collider[]): (t: number) => void {
  const grp = new THREE.Group();
  grp.position.set(p.x, H(p.x, p.z), p.z);
  const log = new THREE.CylinderGeometry(0.09, 0.1, 1.1, 5);
  for (let i = 0; i < 3; i++) {
    const m = mesh(log, mat('#5a3b22'), 0, 0.12, 0);
    m.rotation.order = 'ZXY';
    m.rotation.set(Math.PI / 2, 0, i * 2.1);
    grp.add(m);
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    grp.add(mesh(new THREE.DodecahedronGeometry(0.17, 0), mat('#8d877a'), Math.cos(a) * 0.7, 0.08, Math.sin(a) * 0.7));
  }
  const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 5), new THREE.MeshBasicMaterial({ color: '#ff9a3c' }));
  f1.position.y = 0.55;
  const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 5), new THREE.MeshBasicMaterial({ color: '#ffe08a' }));
  f2.position.y = 0.45;
  const light = new THREE.PointLight('#ff9a46', 4.4, 14, 2);
  light.position.y = 1.1;
  grp.add(f1, f2, light);
  scene.add(grp);
  colliders.push({ x: p.x, z: p.z, r: 1.1 });
  return (t) => {
    const k = 1 + Math.sin(t * 17) * 0.12 + Math.sin(t * 23) * 0.08;
    f1.scale.set(1, k, 1);
    f2.scale.set(1, 2 - k, 1);
    light.intensity = 3.9 + Math.sin(t * 19) * 0.8;
  };
}

const STONE = ['#d6cbb2', '#c7bba0', '#b8ac91'];

/**
 * Casa de piedra de techo plano, como las de los pueblos de Judá: muros de piedra, techo de vigas y
 * barro con un pretil. Medidas en metros; `rot` gira la puerta.
 */
export function house(scene: THREE.Scene, x: number, z: number, rot: number, w: number, d: number, h: number, colliders: Collider[]): void {
  const g = new THREE.Group();
  g.position.set(x, H(x, z) - 0.3, z);
  g.rotation.y = rot;
  g.add(mesh(new THREE.BoxGeometry(w, h + 0.3, d), mat(pick(STONE)), 0, (h + 0.3) / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(w + 0.3, 0.22, d + 0.3), mat('#9c8460'), 0, h + 0.41, 0));
  for (const [px, pz, sx, sz] of [[0, d / 2 + 0.1, w + 0.3, 0.16], [0, -d / 2 - 0.1, w + 0.3, 0.16], [w / 2 + 0.1, 0, 0.16, d + 0.3], [-w / 2 - 0.1, 0, 0.16, d + 0.3]]) {
    g.add(mesh(new THREE.BoxGeometry(sx, 0.4, sz), mat('#cbbf9f'), px, h + 0.72, pz));
  }
  g.add(mesh(new THREE.BoxGeometry(0.9, 1.6, 0.06), mat('#3a2a1c'), 0, 1.1, d / 2 + 0.01));
  g.add(mesh(new THREE.BoxGeometry(0.45, 0.4, 0.06), mat('#2a2018'), w * 0.28, h * 0.62, d / 2 + 0.01));
  scene.add(g);
  // Varios círculos a lo largo de la casa para que el choque se ajuste al rectángulo.
  const n = Math.max(1, Math.round(Math.max(w, d) / Math.min(w, d)));
  const r = Math.min(w, d) / 2 + 0.25, long = w > d;
  for (let i = 0; i < n; i++) {
    const off = ((i + 0.5) / n - 0.5) * Math.max(w, d);
    const lx = long ? off : 0, lz = long ? 0 : off;
    colliders.push({ x: x + lx * Math.cos(rot) + lz * Math.sin(rot), z: z - lx * Math.sin(rot) + lz * Math.cos(rot), r });
  }
}

/**
 * Muro bajo de piedras apiladas siguiendo una lista de puntos (por ejemplo, un redil).
 * Devuelve los círculos de choque.
 */
export function stoneWall(scene: THREE.Scene, pts: Point[], colliders: Collider[], height = 0.9): void {
  const items: { x: number; z: number; s: number }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.round(len / 0.55));
    for (let k = 0; k < n; k++) {
      const t = k / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      items.push({ x, z, s: 0.32 + rand() * 0.12 });
      if (k % 2 === 0) colliders.push({ x, z, r: 0.5 });
    }
  }
  const m = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), mat('#ffffff', { roughness: 0.95 }), items.length * 2);
  const cols = STONE.map((c) => new THREE.Color(c));
  items.forEach((it, i) => {
    for (let k = 0; k < 2; k++) {
      dummy.position.set(it.x + (rand() - 0.5) * 0.15, H(it.x, it.z) + it.s * 0.6 + k * height * 0.5, it.z + (rand() - 0.5) * 0.15);
      dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      dummy.scale.set(it.s * 1.15, it.s * 0.8, it.s);
      dummy.updateMatrix();
      m.setMatrixAt(i * 2 + k, dummy.matrix);
      m.setColorAt(i * 2 + k, pick(cols));
    }
  });
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
}

/** Arco de puntos sobre un círculo, de `a0` a `a1` (radianes, desde +x hacia +z). */
export function arc(cx: number, cz: number, r: number, a0: number, a1: number, step = 0.25): Point[] {
  const out: Point[] = [];
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step));
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r }); }
  return out;
}

/** Bolsas, cántaros y canastas apiladas: el bagaje de un campamento. */
export function baggage(scene: THREE.Scene, p: Point, colliders: Collider[]): void {
  const g = new THREE.Group();
  g.position.set(p.x, H(p.x, p.z), p.z);
  const sack = new THREE.IcosahedronGeometry(0.42, 1), jar = new THREE.CylinderGeometry(0.22, 0.3, 0.7, 7), basket = new THREE.CylinderGeometry(0.42, 0.34, 0.4, 8);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, r = 0.4 + (i % 3) * 0.55, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const kind = i % 3;
    const m = kind === 0 ? mesh(sack, mat('#b59a6a'), x, 0.34, z) : kind === 1 ? mesh(jar, mat('#b0603a'), x, 0.35, z) : mesh(basket, mat('#a37a44'), x, 0.2, z);
    if (kind === 0) m.scale.set(1, 0.8, 1.1);
    g.add(m);
  }
  scene.add(g);
  colliders.push({ x: p.x, z: p.z, r: 1.6 });
}
