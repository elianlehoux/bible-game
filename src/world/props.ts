import * as THREE from 'three';
import { H, mx, distPath, BED_HALF } from './terrain';
import { TENTS, FIRE, START, GOLIAT_POS, TEREBINTO, type Collider, type TentDef } from './layout';
import { mat, mesh } from '../util/materials';
import { rand } from '../util/math';

export interface Props {
  /** Obstáculos fijos (carpas, árboles, rocas grandes, fogata). */
  colliders: Collider[];
  update(t: number): void;
}

interface Flag { geo: THREE.BufferGeometry; base: Float32Array; seed: number }

const TENT_COLORS: Record<TentDef['kind'], string> = { goat: '#5b4838', cream: '#ddcda7', royal: '#6a3d85', red: '#a3412d', stripe: '#e3d0a6' };

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

export function createProps(scene: THREE.Scene, lowEnd: boolean): Props {
  const colliders: Collider[] = [];
  const flags: Flag[] = [];
  const dummy = new THREE.Object3D();
  const wood = mat('#4a3422');

  const addFlag = (parent: THREE.Object3D, x: number, y: number, z: number, color: string) => {
    const g = new THREE.PlaneGeometry(1.3, 0.75, 8, 1);
    g.translate(0.65, 0, 0);
    const f = new THREE.Mesh(g, mat(color, { side: THREE.DoubleSide }));
    f.position.set(x, y, z);
    f.castShadow = true;
    parent.add(f);
    flags.push({ geo: g, base: Float32Array.from(g.attributes.position.array as Float32Array), seed: rand() * 6 });
  };

  // Carpas
  const pole = new THREE.CylinderGeometry(0.05, 0.05, 1, 5);
  for (const t of TENTS) {
    const big = t.kind === 'royal', l = big ? 3.2 : 2.3, w = big ? 2.3 : 1.7, h = big ? 3.2 : 2.4;
    const grp = new THREE.Group();
    grp.position.set(t.x, H(t.x, t.z) - 0.05, t.z);
    grp.rotation.y = t.rot;
    grp.add(mesh(prismGeo(l, w, h), mat(TENT_COLORS[t.kind])));
    const door = new THREE.BufferGeometry();
    door.setAttribute('position', new THREE.BufferAttribute(new Float32Array([l + 0.02, 0, -w * 0.38, l + 0.02, 0, w * 0.38, l + 0.02, h * 0.62, 0]), 3));
    door.computeVertexNormals();
    grp.add(new THREE.Mesh(door, mat('#2a2018', { side: THREE.DoubleSide })));
    for (const px of [-l - 0.05, l + 0.05]) grp.add(mesh(pole, wood, px, h + 0.1, 0));
    if (big) {
      grp.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 5), wood, l + 0.05, h + 0.9, 0));
      addFlag(grp, l + 0.05, h + 1.6, 0, '#e2b445');
    } else if (t.kind === 'red' || t.kind === 'stripe') {
      grp.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 5), wood, l + 0.05, h + 0.7, 0));
      addFlag(grp, l + 0.05, h + 1.25, 0, '#b43a28');
    }
    scene.add(grp);
    colliders.push({ x: t.x, z: t.z, r: big ? 3.2 : 2.4 });
  }

  // Fogata
  const fireGrp = new THREE.Group();
  fireGrp.position.set(FIRE.x, H(FIRE.x, FIRE.z), FIRE.z);
  const log = new THREE.CylinderGeometry(0.09, 0.1, 1.1, 5);
  for (let i = 0; i < 3; i++) {
    const m = mesh(log, mat('#5a3b22'), 0, 0.12, 0);
    m.rotation.order = 'ZXY';
    m.rotation.set(Math.PI / 2, 0, i * 2.1);
    fireGrp.add(m);
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    fireGrp.add(mesh(new THREE.DodecahedronGeometry(0.17, 0), mat('#8d877a'), Math.cos(a) * 0.7, 0.08, Math.sin(a) * 0.7));
  }
  const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 5), new THREE.MeshBasicMaterial({ color: '#ff9a3c' }));
  f1.position.y = 0.55;
  const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 5), new THREE.MeshBasicMaterial({ color: '#ffe08a' }));
  f2.position.y = 0.45;
  const fireLight = new THREE.PointLight('#ff9a46', 4.4, 14, 2);
  fireLight.position.y = 1.1;
  fireGrp.add(f1, f2, fireLight);
  scene.add(fireGrp);
  colliders.push({ x: FIRE.x, z: FIRE.z, r: 1.1 });

  // Lugares donde no debe crecer nada: campamentos, salida y el llano donde David enfrenta a Goliat
  // (puede acercarse desde cualquier lado, así que se despeja todo alrededor).
  const camps = TENTS.map((t) => ({ x: t.x, z: t.z, r: t.kind === 'royal' ? 4 : 3 })).concat([{ x: FIRE.x, z: FIRE.z, r: 3 }, { x: START.x, z: START.z, r: 4 }]);
  const clearLine = (x: number, z: number) => Math.hypot(x - GOLIAT_POS.x, z - GOLIAT_POS.z) < 18;
  const okSpot = (x: number, z: number, pad: number) =>
    Math.abs(x - mx(z)) >= BED_HALF + 1.5 && distPath(x, z) >= 2.5 && !clearLine(x, z) && !camps.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + pad);

  // Árboles (olivos y terebintos). El grande junto al arroyo es el terebinto que da nombre al valle.
  const trees = [TEREBINTO, { x: 8, z: 24, s: 1.3 }];
  for (let i = 0; i < 900 && trees.length < 60; i++) {
    const x = (rand() * 2 - 1) * 62, z = (rand() * 2 - 1) * 48;
    // El llano está cultivado: ahí casi no hay árboles.
    if (!okSpot(x, z, 2.5) || (Math.abs(x) < 13 && rand() < 0.85)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 4)) continue;
    trees.push({ x, z, s: 0.75 + rand() * 0.55 });
  }
  const trunkG = new THREE.CylinderGeometry(0.2, 0.36, 2.3, 6);
  trunkG.translate(0, 1.15, 0);
  const trunks = new THREE.InstancedMesh(trunkG, mat('#6a4a30'), trees.length);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.45, 0), mat('#ffffff'), trees.length * 3);
  const leaf = ['#5b7a37', '#6b8a40', '#7d9752', '#8a9d6e'].map((c) => new THREE.Color(c));
  trees.forEach((t, i) => {
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
      dummy.scale.set(sc * 1.25, sc * 0.8, sc * 1.25);
      dummy.updateMatrix();
      crowns.setMatrixAt(i * 3 + k, dummy.matrix);
      crowns.setColorAt(i * 3 + k, leaf[(rand() * leaf.length) | 0]);
    }
    colliders.push({ x: t.x, z: t.z, r: 0.55 * t.s });
  });
  for (const m of [trunks, crowns]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }

  // Rocas de piedra caliza
  const rocksDef: { x: number; z: number; s: number }[] = [];
  for (let i = 0; i < 1500 && rocksDef.length < 80; i++) {
    const x = (rand() * 2 - 1) * 64, z = (rand() * 2 - 1) * 50, nearStream = Math.abs(x - mx(z)) < BED_HALF + 3;
    if (nearStream ? rand() < 0.4 : !okSpot(x, z, 1.5)) continue;
    if (clearLine(x, z) || distPath(x, z) < 2) continue;
    const s = nearStream ? 0.25 + rand() * 0.35 : Math.abs(x) > 24 ? 0.6 + rand() * 1.6 : 0.35 + rand() * 0.7;
    rocksDef.push({ x, z, s });
  }
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), mat('#ffffff', { roughness: 0.95 }), rocksDef.length);
  const rockCols = ['#cfc3a7', '#b9ad92', '#a49a84', '#d8cfb8'].map((c) => new THREE.Color(c));
  rocksDef.forEach((r, i) => {
    dummy.position.set(r.x, H(r.x, r.z) + r.s * 0.25, r.z);
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    dummy.scale.set(r.s * 1.2, r.s * 0.75, r.s);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    rocks.setColorAt(i, rockCols[(rand() * rockCols.length) | 0]);
    if (r.s > 0.7) colliders.push({ x: r.x, z: r.z, r: r.s * 0.9 });
  });
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  scene.add(rocks);

  // Cantos rodados en el lecho del arroyo: el agua los fue alisando (de ahí sale la honda de David).
  const PB = lowEnd ? 260 : 420;
  const pebbles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat('#ffffff', { roughness: 0.85 }), PB);
  const pebbleCols = ['#ddd5c2', '#c9bfa8', '#b3a991', '#e6e0d1', '#a59d8a'].map((c) => new THREE.Color(c));
  for (let i = 0; i < PB; i++) {
    const z = (rand() * 2 - 1) * 46, x = mx(z) + (rand() * 2 - 1) * (BED_HALF - 0.3), s = 0.06 + rand() * rand() * 0.22;
    dummy.position.set(x, H(x, z) + s * 0.3, z);
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    dummy.scale.set(s * 1.3, s * 0.6, s);
    dummy.updateMatrix();
    pebbles.setMatrixAt(i, dummy.matrix);
    pebbles.setColorAt(i, pebbleCols[(rand() * pebbleCols.length) | 0]);
  }
  pebbles.receiveShadow = true;
  scene.add(pebbles);

  // Pasto y anémonas rojas, la flor silvestre típica de la región.
  const N = lowEnd ? 900 : 1500, FL = 180;
  const tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.55, 3).translate(0, 0.27, 0), mat('#ffffff'), N);
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), mat('#ffffff', { roughness: 0.6 }), FL);
  const grassCols = ['#7f8f45', '#93a14f', '#a9a564', '#6f803b'].map((c) => new THREE.Color(c));
  const flowerCols = ['#d23a30', '#d23a30', '#e8e2d6', '#c94a9a'].map((c) => new THREE.Color(c));
  let n = 0, f = 0;
  for (let i = 0; i < N * 4 && (n < N || f < FL); i++) {
    const x = (rand() * 2 - 1) * 52, z = (rand() * 2 - 1) * 42, y = H(x, z);
    if (Math.abs(x - mx(z)) < BED_HALF + 0.6 || distPath(x, z) < 1.4 || y > 9) continue;
    if (n < N) {
      dummy.position.set(x, y - 0.05, z);
      dummy.rotation.set((rand() - 0.5) * 0.5, rand() * 3, (rand() - 0.5) * 0.5);
      dummy.scale.setScalar(0.7 + rand() * 0.8);
      dummy.updateMatrix();
      tufts.setMatrixAt(n, dummy.matrix);
      tufts.setColorAt(n, grassCols[(rand() * 4) | 0]);
      n++;
    }
    if (f < FL && rand() < 0.2) {
      dummy.position.set(x + 0.3, y + 0.2, z + 0.2);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 0.5, 1);
      dummy.updateMatrix();
      flowers.setMatrixAt(f, dummy.matrix);
      flowers.setColorAt(f, flowerCols[(rand() * 4) | 0]);
      f++;
    }
  }
  tufts.count = n;
  flowers.count = f;
  tufts.receiveShadow = true;
  scene.add(tufts, flowers);

  return {
    colliders,
    update(t) {
      for (const fl of flags) {
        const a = fl.geo.attributes.position;
        for (let i = 0; i < a.count; i++) {
          const x = fl.base[i * 3];
          a.setZ(i, Math.sin(t * 5 + x * 3.5 + fl.seed) * 0.14 * x);
        }
        a.needsUpdate = true;
      }
      const k = 1 + Math.sin(t * 17) * 0.12 + Math.sin(t * 23) * 0.08;
      f1.scale.set(1, k, 1);
      f2.scale.set(1, 2 - k, 1);
      fireLight.intensity = 3.9 + Math.sin(t * 19) * 0.8;
    },
  };
}
