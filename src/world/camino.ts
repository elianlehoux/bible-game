import * as THREE from 'three';
import { vnoise, smooth, clamp, rand } from '../util/math';
import { createTerrainMesh, createWaterMesh, setGround, type Collider, type Point, type World } from './ground';
import { createSky } from './sky';
import { trees, rocks, bushes, grass, scatter, tents, house, Flags, type Spot, type TentDef } from './kit';
import { mat, mesh } from '../util/materials';

// El camino de Belén al valle de Ela: baja de los montes de Judá hacia la Sefelá (1 S 17:20).
// Es un recorrido largo hacia -z con tres pasos difíciles: una ladera de la que caen piedras, un
// arroyo crecido que se cruza pisando piedras y una cornisa sobre un barranco.

/** Centro del camino para una z dada. */
export const px = (z: number): number => 9 * Math.sin(z * 0.024) + 3.5 * Math.sin(z * 0.06 + 1);

export const Z_START = 4;
export const Z_END = -228;
export const DERRUMBE = { z0: -40, z1: -82 };
export const ARROYO = { z: -111, half: 7.5 };
export const CORNISA = { z0: -140, z1: -186, half: 1.5 };
export const WATER_Y = -0.2;

/**
 * Canaletas de la ladera: por cada una baja una piedra cada tantos segundos, siempre por el mismo
 * lugar y con el mismo ritmo, así se puede mirar y pasar entre una y otra.
 */
export const CANALETAS = [
  { z: -47, period: 4.4, offset: 0 },
  { z: -56, period: 4.4, offset: 2.2 },
  { z: -65, period: 3.8, offset: 1.0 },
  { z: -74, period: 3.8, offset: 2.9 },
];
/** Distancia del camino a la boca de cada canaleta (arriba de la ladera). */
export const CANALETA_TOP = 16;
const enCanaleta = (z: number): number => {
  let k = 0;
  for (const c of CANALETAS) k = Math.max(k, smooth(1.9, 0.9, Math.abs(z - c.z)));
  return k;
};

/** Descansos: si David cae, vuelve al último que pasó. */
export const DESCANSOS: Point[] = [Z_START, -32, -92, -128, -192].map((z) => ({ x: px(z), z }));

export interface Piedra extends Point { r: number; sink: boolean; phase: number }

/** Piedras del vado, en zigzag. Algunas se hunden un rato con la corriente. */
export const VADO: Piedra[] = Array.from({ length: 9 }, (_, i) => {
  const z = -103 - i * 1.9;
  return { x: px(z) + (i % 2 ? 0.9 : -0.9), z, r: 1.0, sink: i === 3 || i === 6, phase: i * 1.7 };
});

/** Profundidad a la que está hundida una piedra del vado en el tiempo t (0 = arriba). */
export function hundida(p: Piedra, t: number): number {
  if (!p.sink) return 0;
  const k = ((t + p.phase) % 4) / 4; // ciclo de 4 s: 2.6 arriba, 1.4 bajo el agua
  return k < 0.65 ? 0 : Math.sin(((k - 0.65) / 0.35) * Math.PI) * 0.75;
}

let tNow = 0;

const inCornisa = (z: number) => smooth(CORNISA.z0 + 4, CORNISA.z0 - 2, z) * smooth(CORNISA.z1 - 4, CORNISA.z1 + 2, z);

/** Altura del terreno sin las piedras del vado (la malla se arma con esta). */
function heightBase(x: number, z: number): number {
  const dx = x - px(z), ax = Math.abs(dx);
  // El camino baja de los montes (unos 12 m) hacia la Sefelá.
  const base = 12 * smooth(Z_END - 10, Z_START + 20, z) + 1;
  let h = base + smooth(5, 22, ax) * 12 + (vnoise(x * 0.06, z * 0.06) - 0.5) * 2 * (0.3 + smooth(4, 18, ax) * 2.2);
  // Ladera del derrumbe: más empinada del lado +x.
  const der = smooth(DERRUMBE.z0 + 6, DERRUMBE.z0 - 2, z) * smooth(DERRUMBE.z1 - 6, DERRUMBE.z1 + 2, z);
  if (dx > 0) h += der * smooth(3, 16, dx) * 7 - der * enCanaleta(z) * smooth(2, 6, dx) * 0.6;
  // Cornisa: pared de roca a un lado y barranco al otro.
  const c = inCornisa(z);
  if (c > 0) {
    if (dx > CORNISA.half) h += c * smooth(CORNISA.half, CORNISA.half + 2.5, dx) * 8;
    if (dx < -CORNISA.half) h -= c * smooth(CORNISA.half, CORNISA.half + 3.5, -dx) * (10 + smooth(4, 14, -dx) * 3);
  }
  // Bajada al arroyo: el camino baja de a poco hasta la orilla, sin barranco.
  const r = Math.abs(z - ARROYO.z), valle = smooth(ARROYO.half + 28, ARROYO.half + 2, r);
  if (valle > 0) {
    const orilla = WATER_Y + 0.45 + Math.max(0, r - ARROYO.half) * 0.1 + smooth(5, 24, ax) * 9 + (vnoise(x * 0.08, z * 0.08) - 0.5) * 0.5;
    h = h * (1 - valle) + orilla * valle;
  }
  // Cauce: una orilla baja y el lecho bajo el agua.
  h -= smooth(ARROYO.half + 1.2, ARROYO.half - 1.2, r) * (h - (WATER_Y - 1.1));
  return h;
}

/** Altura con las piedras del vado (David camina por encima de ellas). */
export function heightCamino(x: number, z: number): number {
  if (Math.abs(z - ARROYO.z) < ARROYO.half + 0.5) {
    for (const p of VADO) {
      if (Math.hypot(x - p.x, z - p.z) < p.r) return WATER_Y + 0.32 - hundida(p, tNow);
    }
  }
  return heightBase(x, z);
}

/** David está en el agua del arroyo (no sobre una piedra a flote). */
export function enElAgua(x: number, z: number): boolean {
  return Math.abs(z - ARROYO.z) < ARROYO.half - 0.4 && heightCamino(x, z) < WATER_Y + 0.05;
}

/** David pisó fuera de la cornisa y cae al barranco. */
export function alBarranco(x: number, z: number): boolean {
  return inCornisa(z) > 0.5 && x - px(z) < -(CORNISA.half + 0.45);
}

const PAL = {
  grassA: new THREE.Color('#93a04f'), grassB: new THREE.Color('#7d8c43'), dry: new THREE.Color('#bba96c'),
  path: new THREE.Color('#bea172'), rock: new THREE.Color('#cbbfa2'), rockD: new THREE.Color('#a99d82'),
  bed: new THREE.Color('#9b8f6c'), gravel: new THREE.Color('#cdbf9f'),
  chute: new THREE.Color('#9a8b6e'), pathD: new THREE.Color('#a48a5f'),
};

export interface Camino extends World {
  /** Las piedras del vado, para dibujarlas hundiéndose. */
  vado: THREE.Object3D[];
}

export function createCamino(lowEnd: boolean): Camino {
  const scene = new THREE.Scene();
  setGround(heightCamino);
  createTerrainMesh(scene, {
    width: 130, depth: 304, cz: -106, cell: lowEnd ? 2 : 1.5, height: heightBase,
    color(c, x, y, z, slope, r) {
      const ax = Math.abs(x - px(z)), riv = Math.abs(z - ARROYO.z);
      if (riv < ARROYO.half + 0.5 && y < WATER_Y + 0.4) c.copy(PAL.bed);
      else if (riv < ARROYO.half + 2.5) c.copy(PAL.gravel);
      else if (enCanaleta(z) > 0.5 && x - px(z) > -6 && z < DERRUMBE.z0 && z > DERRUMBE.z1) c.copy(ax < 1.3 ? PAL.pathD : PAL.chute);
      else if (ax < 1.3 + (inCornisa(z) > 0.5 ? 0.2 : 0)) c.copy(PAL.path);
      else if (slope > 0.45) c.copy(r < 0.5 ? PAL.rock : PAL.rockD);
      else {
        c.lerpColors(PAL.grassA, PAL.grassB, vnoise(x * 0.09, z * 0.09));
        c.lerp(PAL.dry, smooth(4, 16, y) * 0.6);
      }
    },
  });
  const sun = createSky(scene, lowEnd);
  const colliders: Collider[] = [];

  // El arroyo y las piedras del vado.
  const wg = new THREE.PlaneGeometry(130, ARROYO.half * 2 + 1, 26, 6);
  wg.rotateX(-Math.PI / 2);
  wg.translate(0, 0, ARROYO.z);
  const water = createWaterMesh(scene, wg, WATER_Y);
  const vado = VADO.map((p) => {
    const g = new THREE.Group();
    g.position.set(p.x, WATER_Y + 0.32, p.z);
    const top = mesh(new THREE.CylinderGeometry(p.r, p.r * 1.15, 1.4, 8), mat(p.sink ? '#a89c84' : '#c9bea4'), 0, -0.7, 0);
    g.add(top);
    scene.add(g);
    return g;
  });

  // Arriba de cada canaleta, un montón de piedras sueltas: de ahí bajan.
  for (const c of CANALETAS) {
    const x = px(c.z) + CANALETA_TOP + 1.5, y = heightBase(x, c.z);
    for (let i = 0; i < 5; i++) {
      const r = 0.5 + (i % 3) * 0.25;
      scene.add(mesh(new THREE.DodecahedronGeometry(r, 0), mat(i % 2 ? '#b3a68a' : '#c4b89c'), x + (i - 2) * 0.5, y + r * 0.6, c.z + ((i * 7) % 5 - 2) * 0.45));
    }
  }

  // Descansos: un mojón de piedras en cada uno.
  for (const d of DESCANSOS.slice(1)) {
    const g = new THREE.Group();
    const x = d.x + 2.4, y = heightBase(x, d.z);
    g.position.set(x, y, d.z);
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.DodecahedronGeometry(0.42 - i * 0.08, 0), mat('#d8cfb8'), 0, 0.3 + i * 0.5, 0));
    scene.add(g);
  }

  // Atrás queda Belén: el mojón de la salida (el mismo del nivel 2) y las casas del pueblo.
  const salida = new THREE.Group();
  salida.position.set(px(Z_START + 2) - 3.4, heightBase(px(Z_START + 2) - 3.4, Z_START + 2), Z_START + 2);
  for (let i = 0; i < 4; i++) salida.add(mesh(new THREE.DodecahedronGeometry(0.45 - i * 0.08, 0), mat('#cfc3a7'), 0, 0.3 + i * 0.55, 0));
  scene.add(salida);
  const pueblo: [number, number, number, number, number][] = [
    [-7, 16, 0.2, 4.2, 3.4], [6, 18, -0.3, 3.6, 3.2], [-12, 22, 0.5, 4.6, 3.6], [1, 25, 0.1, 5, 3.6],
    [10, 26, -0.6, 3.8, 3], [-5, 30, 0.3, 4.4, 3.4], [-16, 31, 0.7, 3.6, 3.2], [7, 33, -0.2, 4, 3.4],
  ];
  for (const [dx, z, rot, w, d] of pueblo) house(scene, px(z) + dx, z, rot, w, d, 2.6, colliders);

  // Al final se ve el campamento de Israel, abajo en el valle.
  const flags = new Flags();
  const camp: TentDef[] = [
    { x: px(-238) - 6, z: -238, rot: 0.3, kind: 'goat' }, { x: px(-242) + 5, z: -242, rot: -0.4, kind: 'cream' },
    { x: px(-247) - 1, z: -247, rot: 0.1, kind: 'royal' }, { x: px(-244) + 12, z: -244, rot: 0.8, kind: 'goat' },
  ];
  tents(scene, camp, colliders, flags);

  // Vegetación en las laderas, lejos del camino, del cauce y de la cornisa.
  const free = (x: number, z: number) => {
    const ax = Math.abs(x - px(z));
    // La ladera de las canaletas queda despejada para ver bajar las piedras.
    const ladera = z < DERRUMBE.z0 + 8 && z > DERRUMBE.z1 - 8 && x - px(z) > -3 && x - px(z) < 26;
    return ax > 5 && !ladera && Math.abs(z - ARROYO.z) > ARROYO.half + 3 && !(inCornisa(z) > 0.1 && ax < 9) && z < Z_START + 8 && z > -236;
  };
  const gen = (): [number, number] => { const z = Z_START + 2 - rand() * 241; return [px(z) + (rand() * 2 - 1) * 50, z]; };
  const tr: Spot[] = scatter(70, 1400, gen, free, 5);
  for (const t of tr) t.s = 0.7 + rand() * 0.6;
  trees(scene, tr.filter((_, i) => i % 3 === 0), colliders, true);
  trees(scene, tr.filter((_, i) => i % 3 !== 0), colliders);
  const rk: Spot[] = scatter(90, 1500, gen, (x, z) => free(x, z) || (Math.abs(x - px(z)) > 3 && Math.abs(x - px(z)) < 5 && rand() < 0.3), 2.5);
  for (const r of rk) r.s = Math.abs(r.x - px(r.z)) > 10 ? 0.5 + rand() * 1.4 : 0.25 + rand() * 0.4;
  rocks(scene, rk, colliders);
  const bs: Spot[] = scatter(60, 900, gen, free, 3);
  for (const b of bs) b.s = 0.5 + rand() * 0.6;
  bushes(scene, bs);
  grass(scene, lowEnd ? 900 : 1500, { cx: 0, cz: -112, rx: 45, rz: 125 }, (x, z, y) => {
    const ax = Math.abs(x - px(z));
    return ax > 1.6 && ax < 30 && Math.abs(z - ARROYO.z) > ARROYO.half + 1 && y > WATER_Y + 0.5;
  });

  return {
    scene, height: heightCamino, colliders, sun, vado,
    clamp(x, z) {
      z = clamp(z, Z_END - 6, Z_START + 6);
      const c = px(z), half = Math.abs(z - ARROYO.z) < ARROYO.half + 3 ? 6 : 7.5;
      // En la cornisa, la pared no deja pasar; del otro lado está el barranco (ahí se cae).
      const right = inCornisa(z) > 0.3 ? CORNISA.half + 0.2 : half;
      const left = inCornisa(z) > 0.3 ? CORNISA.half + 2.5 : half;
      return [clamp(x, c - left, c + right), z];
    },
    speedAt: (x, z) => (Math.abs(z - ARROYO.z) < ARROYO.half && heightCamino(x, z) < WATER_Y + 0.2 ? 0.5 : 1),
    update(t) {
      tNow = t;
      water.update(t);
      flags.update(t);
      VADO.forEach((p, i) => { vado[i].position.y = WATER_Y + 0.32 - hundida(p, t); });
    },
  };
}
