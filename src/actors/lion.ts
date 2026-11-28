import * as THREE from 'three';
import { mat, mesh } from '../util/materials';
import { H } from '../world/ground';

/** León armado con formas simples, como los personajes. Mira hacia +z. */
export interface Lion {
  g: THREE.Group;
  rig: THREE.Group;
  head: THREE.Group;
  /** Punto en la boca donde lleva al cordero. */
  mouth: THREE.Group;
  legs: THREE.Group[];
  tail: THREE.Group;
  phase: number;
  /** 0 de pie; 1 agazapado, a punto de saltar. */
  crouch: number;
  /** 1 tendido en el suelo, vencido. */
  down: number;
}

const FUR = mat('#c9a15a'), FUR_D = mat('#b38a47'), MANE = mat('#7a4a22'), DARK = mat('#2a1d14');

export function createLion(scene: THREE.Scene, x: number, z: number, yaw: number): Lion {
  const g = new THREE.Group(), rig = new THREE.Group();
  g.add(rig);
  const body = mesh(new THREE.IcosahedronGeometry(0.62, 1), FUR, 0, 0.95, -0.15);
  body.scale.set(0.82, 0.78, 1.55);
  const belly = mesh(new THREE.IcosahedronGeometry(0.45, 1), FUR_D, 0, 0.82, -0.75);
  belly.scale.set(0.95, 0.9, 1.1);
  rig.add(body, belly);

  const legs: THREE.Group[] = [];
  const legG = new THREE.CylinderGeometry(0.13, 0.1, 0.72, 6).translate(0, -0.36, 0);
  const paw = new THREE.IcosahedronGeometry(0.13, 0);
  for (const [lx, lz] of [[-0.3, 0.6], [0.3, 0.6], [-0.28, -0.95], [0.28, -0.95]]) {
    const l = new THREE.Group();
    l.position.set(lx, 0.78, lz);
    l.add(mesh(legG, FUR), mesh(paw, FUR_D, 0, -0.72, 0.04));
    rig.add(l);
    legs.push(l);
  }

  const head = new THREE.Group();
  head.position.set(0, 1.25, 0.95);
  rig.add(head);
  const mane = mesh(new THREE.IcosahedronGeometry(0.55, 1), MANE, 0, 0, -0.12);
  mane.scale.set(1, 1.05, 0.85);
  const face = mesh(new THREE.IcosahedronGeometry(0.34, 1), FUR, 0, -0.02, 0.22);
  const snout = mesh(new THREE.BoxGeometry(0.28, 0.2, 0.26), FUR_D, 0, -0.12, 0.46);
  const nose = mesh(new THREE.BoxGeometry(0.12, 0.07, 0.06), DARK, 0, -0.06, 0.6);
  head.add(mane, face, snout, nose);
  for (const ex of [-0.13, 0.13]) head.add(mesh(new THREE.BoxGeometry(0.06, 0.05, 0.03), DARK, ex, 0.07, 0.5));
  for (const ex of [-0.28, 0.28]) head.add(mesh(new THREE.IcosahedronGeometry(0.1, 0), MANE, ex, 0.38, 0.05));
  const mouth = new THREE.Group();
  mouth.position.set(0, -0.32, 0.55);
  head.add(mouth);

  const tail = new THREE.Group();
  tail.position.set(0, 1.05, -1.1);
  const shaft = mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 5).translate(0, -0.45, 0), FUR);
  tail.add(shaft, mesh(new THREE.IcosahedronGeometry(0.11, 0), MANE, 0, -0.92, 0));
  tail.rotation.x = 0.6;
  rig.add(tail);

  g.position.set(x, H(x, z), z);
  g.rotation.y = yaw;
  scene.add(g);
  return { g, rig, head, mouth, legs, tail, phase: 0, crouch: 0, down: 0 };
}

/** speed 0..1 (1 = carrera). */
export function animateLion(l: Lion, speed: number, dt: number, t: number): void {
  if (speed > 0.05) {
    l.phase += dt * (6 + 9 * speed);
    const a = Math.sin(l.phase) * 0.8 * Math.min(1, speed * 1.4);
    l.legs[0].rotation.x = a;
    l.legs[1].rotation.x = a * 0.8;
    l.legs[2].rotation.x = -a;
    l.legs[3].rotation.x = -a * 0.8;
    l.rig.position.y = Math.abs(Math.sin(l.phase)) * 0.1 * speed;
  } else {
    for (const leg of l.legs) leg.rotation.x *= 0.8;
    l.rig.position.y *= 0.8;
  }
  l.tail.rotation.z = Math.sin(t * 3) * 0.35;
  // Agazapado: baja el cuerpo y adelanta la cabeza. Vencido: tendido de costado.
  l.rig.position.y -= l.crouch * 0.32;
  l.head.position.y = 1.25 - l.crouch * 0.15;
  l.rig.rotation.z = l.down * (Math.PI / 2) * 0.95;
  l.rig.position.y += l.down * 0.25;
}
