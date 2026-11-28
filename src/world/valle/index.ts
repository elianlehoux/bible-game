import * as THREE from 'three';
import { mx, distPath, BED_HALF, heightValle, inWater, createTerrain, createWater } from './terreno';
import { TENTS, FIRE, START, GOLIAT_POS, TEREBINTO, BAGAJE, BOUNDS } from './layout';
import { setGround, clampEllipse, type Collider, type World } from '../ground';
import { createSky } from '../sky';
import { Flags, tents, fire, trees, rocks, grass, scatter, baggage, type Spot } from '../kit';
import { mat } from '../../util/materials';
import { rand } from '../../util/math';

/** Valle de Ela (1 S 17): los dos campamentos, el llano y el lecho del arroyo. */
export function createValle(lowEnd: boolean): World {
  const scene = new THREE.Scene();
  setGround(heightValle);
  createTerrain(scene);
  const water = createWater(scene);
  const sun = createSky(scene, lowEnd);
  const colliders: Collider[] = [];
  const flags = new Flags();

  tents(scene, TENTS, colliders, flags);
  const fireAnim = fire(scene, FIRE, colliders);
  baggage(scene, BAGAJE, colliders);

  // Lugares donde no debe crecer nada: campamentos, salida y el llano donde David enfrenta a Goliat
  // (puede acercarse desde cualquier lado, así que se despeja todo alrededor).
  const camps = TENTS.map((t) => ({ x: t.x, z: t.z, r: t.kind === 'royal' ? 4 : 3 })).concat([{ x: FIRE.x, z: FIRE.z, r: 3 }, { x: START.x, z: START.z, r: 4 }, { x: BAGAJE.x, z: BAGAJE.z, r: 3 }]);
  const clearLine = (x: number, z: number) => Math.hypot(x - GOLIAT_POS.x, z - GOLIAT_POS.z) < 18;
  const okSpot = (x: number, z: number, pad: number) =>
    Math.abs(x - mx(z)) >= BED_HALF + 1.5 && distPath(x, z) >= 2.5 && !clearLine(x, z) && !camps.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + pad);

  // Árboles (olivos y terebintos). El grande junto al arroyo es el terebinto que da nombre al valle.
  // El llano está cultivado: ahí casi no hay árboles.
  const fixed: Spot[] = [TEREBINTO, { x: 8, z: 24, s: 1.3 }];
  const more = scatter(58, 900, () => [(rand() * 2 - 1) * 62, (rand() * 2 - 1) * 48], (x, z) => okSpot(x, z, 2.5) && !(Math.abs(x) < 13 && rand() < 0.85), 4, fixed);
  for (const t of more) t.s = 0.75 + rand() * 0.55;
  trees(scene, fixed.concat(more), colliders);

  // Rocas de piedra caliza: chicas junto al arroyo, grandes en las laderas.
  const rockList: Spot[] = [];
  for (let i = 0; i < 1500 && rockList.length < 80; i++) {
    const x = (rand() * 2 - 1) * 64, z = (rand() * 2 - 1) * 50, nearStream = Math.abs(x - mx(z)) < BED_HALF + 3;
    if (nearStream ? rand() < 0.4 : !okSpot(x, z, 1.5)) continue;
    if (clearLine(x, z) || distPath(x, z) < 2) continue;
    rockList.push({ x, z, s: nearStream ? 0.25 + rand() * 0.35 : Math.abs(x) > 24 ? 0.6 + rand() * 1.6 : 0.35 + rand() * 0.7 });
  }
  rocks(scene, rockList, colliders);

  // Cantos rodados en el lecho del arroyo: el agua los fue alisando (de ahí sale la honda de David).
  const PB = lowEnd ? 260 : 420;
  const pebbles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat('#ffffff', { roughness: 0.85 }), PB);
  const pebbleCols = ['#ddd5c2', '#c9bfa8', '#b3a991', '#e6e0d1', '#a59d8a'].map((c) => new THREE.Color(c));
  const dummy = new THREE.Object3D();
  for (let i = 0; i < PB; i++) {
    const z = (rand() * 2 - 1) * 46, x = mx(z) + (rand() * 2 - 1) * (BED_HALF - 0.3), s = 0.06 + rand() * rand() * 0.22;
    dummy.position.set(x, heightValle(x, z) + s * 0.3, z);
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    dummy.scale.set(s * 1.3, s * 0.6, s);
    dummy.updateMatrix();
    pebbles.setMatrixAt(i, dummy.matrix);
    pebbles.setColorAt(i, pebbleCols[(rand() * pebbleCols.length) | 0]);
  }
  pebbles.receiveShadow = true;
  scene.add(pebbles);

  grass(scene, lowEnd ? 900 : 1500, { cx: 0, cz: 0, rx: 52, rz: 42 }, (x, z, y) => Math.abs(x - mx(z)) >= BED_HALF + 0.6 && distPath(x, z) >= 1.4 && y <= 9);

  return {
    scene, height: heightValle, colliders, sun,
    clamp: (x, z) => clampEllipse(x, z, BOUNDS.rx, BOUNDS.rz),
    speedAt: (x, z) => (inWater(x, z) ? 0.55 : 1),
    update(t) { flags.update(t); fireAnim(t); water.update(t); },
  };
}
