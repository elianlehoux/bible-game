import * as THREE from 'three';
import { mesh } from '../util/materials';
import { H } from '../world/ground';

/**
 * León armado con formas simples, como los personajes. Mira hacia +z.
 * Cada pata tiene dos tramos (muslo y caña) para que el paso se vea natural.
 */
export interface Lion {
  g: THREE.Group;
  rig: THREE.Group;
  head: THREE.Group;
  jaw: THREE.Group;
  /** Punto en la boca donde lleva al cordero. */
  mouth: THREE.Group;
  legs: { hip: THREE.Group; knee: THREE.Group; front: boolean; side: number }[];
  tail: THREE.Group;
  tailTip: THREE.Group;
  phase: number;
  /** 0 de pie; 1 agazapado, a punto de saltar. */
  crouch: number;
  /** 0..1 estirado en el aire (salto). */
  leap: number;
  /** 0..1 rugido: levanta la cabeza y abre la boca. */
  roar: number;
  /** 0..1 recién golpeado: se encoge y brilla un instante. */
  hurt: number;
  /** 1 tendido en el suelo, vencido. */
  down: number;
  /** Lleva algo en la boca. */
  carry: boolean;
  mats: THREE.MeshStandardMaterial[];
}

const furMat = (c: string) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.9 });

const HIP_Y = 0.98, THIGH = 0.44, SHIN = 0.44;

export function createLion(scene: THREE.Scene, x: number, z: number, yaw: number): Lion {
  // Materiales propios: así el brillo al golpearlo no afecta a nada más.
  const FUR = furMat('#c9a15a'), FUR_D = furMat('#b38a47'), MANE = furMat('#7a4a22'), DARK = furMat('#2a1d14');
  const g = new THREE.Group(), rig = new THREE.Group();
  g.add(rig);
  const body = mesh(new THREE.IcosahedronGeometry(0.62, 1), FUR, 0, 1.0, -0.15);
  body.scale.set(0.8, 0.74, 1.55);
  const chest = mesh(new THREE.IcosahedronGeometry(0.5, 1), FUR, 0, 1.02, 0.5);
  chest.scale.set(0.95, 1.0, 0.9);
  const belly = mesh(new THREE.IcosahedronGeometry(0.42, 1), FUR_D, 0, 0.86, -0.75);
  belly.scale.set(0.95, 0.85, 1.1);
  rig.add(body, chest, belly);

  const legs: Lion['legs'] = [];
  const thighG = new THREE.CylinderGeometry(0.15, 0.11, THIGH, 6).translate(0, -THIGH / 2, 0);
  const shinG = new THREE.CylinderGeometry(0.1, 0.08, SHIN, 6).translate(0, -SHIN / 2, 0);
  const pawG = new THREE.IcosahedronGeometry(0.12, 0);
  for (const [lx, lz, front] of [[-0.27, 0.62, 1], [0.27, 0.62, 1], [-0.27, -0.95, 0], [0.27, -0.95, 0]] as const) {
    const hip = new THREE.Group(), knee = new THREE.Group();
    hip.position.set(lx, HIP_Y, lz);
    knee.position.y = -THIGH;
    hip.add(mesh(thighG, FUR), knee);
    const paw = mesh(pawG, FUR_D, 0, -SHIN, 0.05);
    paw.scale.set(1, 0.6, 1.25);
    knee.add(mesh(shinG, FUR), paw);
    rig.add(hip);
    legs.push({ hip, knee, front: front === 1, side: lx < 0 ? -1 : 1 });
  }

  const head = new THREE.Group();
  head.position.set(0, 1.3, 0.98);
  rig.add(head);
  const mane = mesh(new THREE.IcosahedronGeometry(0.56, 1), MANE, 0, 0, -0.14);
  mane.scale.set(1.05, 1.08, 0.85);
  const face = mesh(new THREE.IcosahedronGeometry(0.33, 1), FUR, 0, 0, 0.2);
  const snout = mesh(new THREE.BoxGeometry(0.28, 0.16, 0.28), FUR_D, 0, -0.08, 0.45);
  const nose = mesh(new THREE.BoxGeometry(0.12, 0.07, 0.06), DARK, 0, -0.03, 0.6);
  head.add(mane, face, snout, nose);
  for (const ex of [-0.13, 0.13]) head.add(mesh(new THREE.BoxGeometry(0.07, 0.05, 0.03), DARK, ex, 0.08, 0.48));
  for (const ex of [-0.27, 0.27]) head.add(mesh(new THREE.IcosahedronGeometry(0.1, 0), MANE, ex, 0.38, 0.04));
  // Mandíbula: se abre al rugir.
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.15, 0.3);
  jaw.add(mesh(new THREE.BoxGeometry(0.24, 0.08, 0.3), FUR_D, 0, -0.04, 0.15));
  jaw.add(mesh(new THREE.BoxGeometry(0.2, 0.04, 0.22), furMat('#8e3a2c'), 0, 0.01, 0.13));
  head.add(jaw);
  const mouth = new THREE.Group();
  mouth.position.set(0, -0.3, 0.55);
  head.add(mouth);

  const tail = new THREE.Group(), tailTip = new THREE.Group();
  tail.position.set(0, 1.08, -1.12);
  tail.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 5).translate(0, -0.25, 0), FUR), tailTip);
  tailTip.position.y = -0.5;
  tailTip.add(mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.45, 5).translate(0, -0.22, 0), FUR), mesh(new THREE.IcosahedronGeometry(0.11, 0), MANE, 0, -0.47, 0));
  rig.add(tail);

  g.position.set(x, H(x, z), z);
  g.rotation.y = yaw;
  scene.add(g);
  return { g, rig, head, jaw, mouth, legs, tail, tailTip, phase: 0, crouch: 0, leap: 0, roar: 0, hurt: 0, down: 0, carry: false, mats: [FUR, FUR_D, MANE] };
}

const TAU = Math.PI * 2;
/** Desfase de cada pata en el ciclo: al paso (lateral) y al galope (de a pares). */
const WALK_OFF = [0.25, 0.75, 0, 0.5];
const RUN_OFF = [0.0, 0.12, 0.5, 0.62];

/**
 * speed 0..1 (1 = carrera). Las poses (agazapado, salto, rugido, golpe, vencido) se mezclan
 * encima del paso según los valores de `l`.
 */
export function animateLion(l: Lion, speed: number, dt: number, t: number): void {
  const moving = speed > 0.04 ? 1 : 0;
  l.phase = (l.phase + dt * (0.9 + 2.0 * speed) * moving) % 1;
  const run = THREE.MathUtils.smoothstep(speed, 0.45, 0.8);
  const amp = Math.min(1, speed * 2.2);
  const c = l.crouch, lp = l.leap, dn = l.down;

  l.legs.forEach((leg, i) => {
    const off = WALK_OFF[i] * (1 - run) + RUN_OFF[i] * run;
    const a = (l.phase + off) * TAU;
    // Hacia adelante cuando la pata está en el aire; la rodilla se dobla al levantarla.
    let hip = Math.sin(a) * (0.45 + 0.35 * run) * amp;
    let knee = Math.max(0, Math.cos(a)) * (0.7 + 0.4 * run) * amp;
    if (!leg.front) { hip -= 0.18; knee = -knee * 0.7 + 0.25; }
    // Agazapado: patas recogidas.
    hip = hip * (1 - c) + (leg.front ? -0.55 : -0.75) * c;
    knee = knee * (1 - c) + (leg.front ? 1.25 : 1.35) * c;
    // En el aire: delanteras estiradas hacia adelante, traseras hacia atrás.
    hip = hip * (1 - lp) + (leg.front ? -1.25 : 0.95) * lp;
    knee = knee * (1 - lp) + (leg.front ? 0.15 : 0.3) * lp;
    // Vencido: patas sueltas.
    hip = hip * (1 - dn) + (leg.front ? -0.35 : 0.3) * dn;
    knee = knee * (1 - dn) + 0.3 * dn;
    leg.hip.rotation.x = hip;
    leg.knee.rotation.x = knee;
  });

  // Cuerpo: sube y baja con el paso; al galope se arquea.
  const step = l.phase * TAU;
  const bob = Math.abs(Math.sin(step * 2)) * (0.04 + 0.08 * run) * amp;
  l.rig.position.y = bob - c * 0.36 + lp * 0.1 + dn * 0.28;
  l.rig.rotation.x = Math.sin(step) * 0.07 * run * amp - lp * 0.22 + l.hurt * 0.25 + c * 0.06;
  l.rig.rotation.z = dn * (Math.PI / 2) * 0.95 + Math.sin(t * 40) * l.hurt * 0.08;

  // Cabeza: baja al acecho, sube al rugir.
  const headBob = Math.sin(step * 2) * 0.04 * amp;
  l.head.position.y = 1.3 - c * 0.12 + headBob;
  l.head.rotation.x = -l.roar * 0.55 + c * 0.2 + (l.carry ? -0.15 : 0) + dn * 0.3;
  l.jaw.rotation.x = l.roar * 0.75 + (l.carry ? 0.3 : 0) + Math.max(0, Math.sin(t * 9)) * 0.04;

  // Cola: se balancea al caminar; agazapado, la punta se agita rápido.
  l.tail.rotation.x = 0.55 + run * 0.6 + lp * 0.5 - dn * 0.4;
  l.tail.rotation.z = Math.sin(t * 2.2 + step) * 0.3 * (1 - dn);
  l.tailTip.rotation.x = -0.4 + Math.sin(t * 3) * 0.2 + c * Math.sin(t * 22) * 0.45;

  // Brillo al recibir un golpe.
  for (const m of l.mats) m.emissive.setRGB(l.hurt * 0.55, l.hurt * 0.25, 0);
  l.hurt = Math.max(0, l.hurt - dt * 2.5);
}
