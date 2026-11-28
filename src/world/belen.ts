import * as THREE from 'three';
import { vnoise, smooth, rand, distPaths } from '../util/math';
import { createTerrainMesh, setGround, clampEllipse, type Collider, type Point, type World } from './ground';
import { createSky, ATARDECER, MANANA } from './sky';
import { trees, rocks, bushes, grass, scatter, house, stoneWall, arc, type Spot } from './kit';
import { mat, mesh } from '../util/materials';

// Los campos de Belén, donde David cuida las ovejas de su padre (1 S 16:11; 17:15).
// Un pastizal en una hondonada, el redil de piedra, el pueblo en la loma del norte (-z) y, al
// sur, los matorrales de donde sale el león. El camino al valle de Ela sale hacia el oeste (-x).

/** El redil: un círculo de piedras apiladas con la entrada hacia el oeste. */
export const REDIL = { x: 8, z: 6, r: 5.2, gap: Math.PI, gapHalf: 0.42 };
/** Matorral y cueva donde se esconde el león. */
export const GUARIDA: Point = { x: -32, z: 30 };
/** Casa de Isaí, a la entrada del pueblo, con su patio. */
export const CASA_ISAI = { x: -10, z: -27, rot: 0.15 };
export const PATIO: Point = { x: -10, z: -21.5 };
/** Donde empieza el camino hacia el valle de Ela. */
export const SALIDA: Point = { x: -45, z: -9 };
export const BOUNDS = { rx: 50, rz: 44 };

export const OVEJAS: (Point & { cordero?: boolean })[] = [
  { x: -22, z: 9 }, { x: -15, z: 22 }, { x: -5, z: 27, cordero: true }, { x: 15, z: 25 },
  { x: 25, z: 13 }, { x: 26, z: -7, cordero: true }, { x: -25, z: -5 }, { x: 4, z: -14 },
];

const PATHS: [number, number][][] = [
  // Del redil al pueblo.
  [[4, 6], [-2, -6], [-8, -16], [-10, -21]],
  // Del pueblo hacia el oeste: el camino al valle de Ela.
  [[-10, -21], [-22, -16], [-34, -12], [-48, -8]],
];
export const distPath = (x: number, z: number): number => distPaths(PATHS, x, z);

/** Altura de los campos de Belén. */
export function heightBelen(x: number, z: number): number {
  const r = Math.hypot(x / 1.15, z);
  const bowl = smooth(26, 62, r) * 11;
  const ridge = smooth(18, 40, -z) * 7; // el pueblo queda más alto
  const n = (vnoise(x * 0.05 + 40, z * 0.05) - 0.5) * 2 * (0.6 + smooth(20, 50, r) * 2) + (vnoise(x * 0.18, z * 0.18 + 9) - 0.5) * 0.35;
  // El redil y el patio se aplanan un poco.
  const flatPen = Math.exp(-((x - REDIL.x) ** 2 + (z - REDIL.z) ** 2) / 60);
  const flatYard = Math.exp(-((x - PATIO.x) ** 2 + (z - PATIO.z + 3) ** 2) / 70);
  return (bowl + ridge + n) * (1 - 0.7 * Math.max(flatPen, flatYard)) + 0.2;
}

const PAL = {
  grassA: new THREE.Color('#93a04f'), grassB: new THREE.Color('#7d8c43'), dry: new THREE.Color('#bba96c'),
  path: new THREE.Color('#bea172'), rock: new THREE.Color('#cbbfa2'), rockD: new THREE.Color('#a99d82'),
  terrace: new THREE.Color('#a8995e'),
};

export function createBelen(lowEnd: boolean, hora: 'tarde' | 'manana'): World {
  const scene = new THREE.Scene();
  setGround(heightBelen);
  createTerrainMesh(scene, {
    width: 240, depth: 220, height: heightBelen,
    color(c, x, y, z, slope, r) {
      if (distPath(x, z) < 1.4 && y < 12) c.copy(PAL.path);
      else if (slope > 0.42 || y > 13 + r * 3) c.copy(r < 0.5 ? PAL.rock : PAL.rockD);
      else if (z < -24 && y > 5 && Math.sin(y * 2.4) > 0.55) c.copy(PAL.terrace); // terrazas de cultivo junto al pueblo
      else {
        c.lerpColors(PAL.grassA, PAL.grassB, vnoise(x * 0.09, z * 0.09));
        c.lerp(PAL.dry, smooth(2, 12, y) * 0.7);
      }
    },
  });
  const sun = createSky(scene, lowEnd, hora === 'tarde' ? ATARDECER : MANANA);
  const colliders: Collider[] = [];

  // El redil.
  stoneWall(scene, arc(REDIL.x, REDIL.z, REDIL.r, REDIL.gap + REDIL.gapHalf, REDIL.gap + Math.PI * 2 - REDIL.gapHalf), colliders);

  // Belén: la casa de Isaí con su patio y otras casas en la loma.
  house(scene, CASA_ISAI.x, CASA_ISAI.z, CASA_ISAI.rot, 7, 5, 3, colliders);
  stoneWall(scene, [{ x: -15.5, z: -24.5 }, { x: -15.5, z: -18 }, { x: -12.5, z: -18 }], colliders, 0.7);
  stoneWall(scene, [{ x: -7.5, z: -18 }, { x: -4.5, z: -18 }, { x: -4.5, z: -24.5 }], colliders, 0.7);
  const village: [number, number, number, number, number, number][] = [
    [4, -32, -0.2, 5, 4, 3], [12, -36, 0.4, 6, 4.5, 3.2], [-2, -40, 0.1, 5.5, 5, 3], [-18, -36, -0.3, 6, 4, 2.8],
    [-26, -31, 0.5, 4.5, 4, 2.8], [20, -30, -0.5, 4, 4, 2.6], [8, -44, 0, 7, 5, 3.4], [-12, -44, 0.2, 5, 4.5, 3],
  ];
  for (const [x, z, rot, w, d, h] of village) house(scene, x, z, rot, w, d, h, colliders);

  // La cueva del león: una boca oscura entre rocas y matorrales.
  const cave = mesh(new THREE.SphereGeometry(2.4, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#8f846c'), GUARIDA.x - 3, heightBelen(GUARIDA.x - 3, GUARIDA.z + 3) - 0.4, GUARIDA.z + 3);
  cave.scale.set(1.4, 1, 1);
  const mouth = mesh(new THREE.CircleGeometry(1.1, 8), mat('#1e1812'), 0, 0.9, 2.35);
  mouth.scale.set(1, 0.8, 1);
  cave.add(mouth);
  scene.add(cave);
  colliders.push({ x: GUARIDA.x - 3, z: GUARIDA.z + 3, r: 3 });

  // Mojón al comienzo del camino al oeste.
  const cairn = new THREE.Group();
  cairn.position.set(SALIDA.x, heightBelen(SALIDA.x, SALIDA.z), SALIDA.z);
  for (let i = 0; i < 4; i++) cairn.add(mesh(new THREE.DodecahedronGeometry(0.45 - i * 0.08, 0), mat('#cfc3a7'), 0, 0.3 + i * 0.55, 0));
  scene.add(cairn);

  // Vegetación.
  const busy: Point[] = [REDIL, PATIO, CASA_ISAI, SALIDA, ...village.map(([x, z]) => ({ x, z }))];
  const free = (x: number, z: number, pad: number) => distPath(x, z) > 2.5 && !busy.some((b) => Math.hypot(b.x - x, b.z - z) < 7 + pad) && Math.hypot(x - GUARIDA.x, z - GUARIDA.z) > 5;
  const olives = scatter(26, 600, () => [(rand() * 2 - 1) * 45, -20 - rand() * 30], (x, z) => free(x, z, 0) && heightBelen(x, z) > 3, 5);
  for (const t of olives) t.s = 0.7 + rand() * 0.35;
  trees(scene, olives, colliders, true);
  const wild: Spot[] = scatter(22, 600, () => [(rand() * 2 - 1) * 60, (rand() * 2 - 1) * 50], (x, z) => free(x, z, 2) && Math.hypot(x, z) > 18 && z > -18, 6);
  for (const t of wild) t.s = 0.8 + rand() * 0.5;
  trees(scene, wild, colliders);
  const thicket = scatter(22, 300, () => [GUARIDA.x + (rand() * 2 - 1) * 9, GUARIDA.z + (rand() * 2 - 1) * 7], (x, z) => Math.hypot(x - GUARIDA.x + 3, z - GUARIDA.z - 3) > 3.2, 1.6);
  for (const b of thicket) b.s = 0.9 + rand() * 0.7;
  const scrub = scatter(40, 600, () => [(rand() * 2 - 1) * 55, (rand() * 2 - 1) * 45], (x, z) => free(x, z, 0) && Math.hypot(x - REDIL.x, z - REDIL.z) > 9, 3);
  for (const b of scrub) b.s = 0.5 + rand() * 0.5;
  bushes(scene, thicket.concat(scrub));
  const rockList = scatter(60, 900, () => [(rand() * 2 - 1) * 62, (rand() * 2 - 1) * 52], (x, z) => free(x, z, 0) && Math.hypot(x - REDIL.x, z - REDIL.z) > 8, 2);
  for (const r of rockList) r.s = Math.hypot(r.x, r.z) > 30 ? 0.5 + rand() * 1.3 : 0.25 + rand() * 0.5;
  rocks(scene, rockList, colliders);
  grass(scene, lowEnd ? 900 : 1500, { cx: 0, cz: 0, rx: 50, rz: 44 }, (x, z, y) => distPath(x, z) > 1.3 && y < 11 && Math.hypot(x - REDIL.x, z - REDIL.z) > REDIL.r + 0.6);

  return {
    scene, height: heightBelen, colliders, sun,
    clamp: (x, z) => clampEllipse(x, z, BOUNDS.rx, BOUNDS.rz),
    update() { /* sin animaciones propias */ },
  };
}
