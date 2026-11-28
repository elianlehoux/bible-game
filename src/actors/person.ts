import * as THREE from 'three';
import { mat, mesh, BRONZE } from '../util/materials';
import { rand } from '../util/math';
import { H } from '../world/terrain';

/**
 * Apariencia de un personaje armado con formas simples.
 * En el juego final esto se reemplaza por modelos 3D con esqueleto (ver docs/investigacion/estilo-visual.md).
 */
export interface Look {
  tunic: string;
  skin?: string;
  hair?: string;
  belt?: string;
  scale?: number;
  beard?: boolean;
  /** Color del casco, o 'bronze'. */
  helmet?: string;
  crest?: string;
  crown?: boolean;
  /** Tocado de plumas filisteo. */
  feathers?: boolean;
  cape?: string;
  armor?: boolean;
  greaves?: boolean;
  spear?: boolean | 'big';
  staff?: boolean;
  bag?: boolean;
  shield?: boolean;
}

export interface Person {
  g: THREE.Group;
  rig: THREE.Group;
  body: THREE.Mesh;
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  phase: number;
  seed: number;
  /** Brazos en alto (festejo). */
  armsUp: boolean;
  /** El brazo derecho lo controla la honda. */
  sling: boolean;
}

const GEO = {
  leg: new THREE.CylinderGeometry(0.1, 0.085, 0.74, 6).translate(0, -0.37, 0),
  foot: new THREE.BoxGeometry(0.17, 0.08, 0.28),
  body: new THREE.CylinderGeometry(0.29, 0.47, 1.02, 8),
  belt: new THREE.CylinderGeometry(0.33, 0.36, 0.09, 8),
  shoulder: new THREE.SphereGeometry(0.3, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2),
  arm: new THREE.CylinderGeometry(0.085, 0.07, 0.6, 6).translate(0, -0.3, 0),
  hand: new THREE.IcosahedronGeometry(0.085, 0),
  head: new THREE.IcosahedronGeometry(0.29, 1),
  hair: new THREE.SphereGeometry(0.305, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.56),
  eye: new THREE.BoxGeometry(0.05, 0.065, 0.03),
  beard: new THREE.IcosahedronGeometry(0.19, 0),
  helmet: new THREE.SphereGeometry(0.335, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5),
  ring: new THREE.CylinderGeometry(0.3, 0.3, 0.11, 10, 1, true),
  spike: new THREE.ConeGeometry(0.045, 0.14, 4),
  feather: new THREE.ConeGeometry(0.045, 0.36, 4),
  shaft: new THREE.CylinderGeometry(0.03, 0.03, 2.6, 5),
  bigShaft: new THREE.CylinderGeometry(0.065, 0.065, 3.2, 6),
  tip: new THREE.ConeGeometry(0.06, 0.24, 4),
};
const EYE = mat('#1a1410');
const WOOD = mat('#6a4a30');
const GOLD = mat('#e2b445', { metalness: 0.6, roughness: 0.3 });

export function createPerson(scene: THREE.Scene, o: Look, x: number, z: number, yaw: number): Person {
  const g = new THREE.Group(), rig = new THREE.Group();
  g.add(rig);
  rig.scale.setScalar(o.scale ?? 1);
  const skin = mat(o.skin ?? '#c68b61'), tunic = mat(o.tunic), hair = mat(o.hair ?? '#3a2a20');
  const legM = o.greaves ? BRONZE : skin;

  const mkLeg = (lx: number) => {
    const l = new THREE.Group();
    l.position.set(lx, 0.74, 0);
    l.add(mesh(GEO.leg, legM), mesh(GEO.foot, mat('#4a3020'), 0, -0.71, 0.05));
    rig.add(l);
    return l;
  };
  const legL = mkLeg(-0.15), legR = mkLeg(0.15);
  const body = mesh(GEO.body, tunic, 0, 1.2, 0);
  rig.add(body, mesh(GEO.belt, mat(o.belt ?? '#5a3b22'), 0, 1.15, 0));
  const sh = mesh(GEO.shoulder, tunic, 0, 1.66, 0);
  sh.scale.y = 0.6;
  rig.add(sh);
  if (o.armor) rig.add(mesh(new THREE.CylinderGeometry(0.34, 0.5, 0.78, 8), BRONZE, 0, 1.36, 0));

  const mkArm = (ax: number) => {
    const a = new THREE.Group();
    a.position.set(ax, 1.62, 0);
    a.add(mesh(GEO.arm, tunic), mesh(GEO.hand, skin, 0, -0.64, 0));
    rig.add(a);
    return a;
  };
  const armL = mkArm(-0.37), armR = mkArm(0.37);

  const head = new THREE.Group();
  head.position.set(0, 2.02, 0);
  rig.add(head);
  head.add(mesh(GEO.head, skin));
  const hr = mesh(GEO.hair, hair, 0, 0.03, -0.02);
  hr.rotation.x = -0.3;
  head.add(hr, mesh(GEO.eye, EYE, -0.1, 0.02, 0.265), mesh(GEO.eye, EYE, 0.1, 0.02, 0.265));
  if (o.beard) {
    const b = mesh(GEO.beard, hair, 0, -0.17, 0.15);
    b.scale.set(1, 0.95, 0.75);
    head.add(b);
  }
  if (o.helmet) {
    const h = mesh(GEO.helmet, o.helmet === 'bronze' ? BRONZE : mat(o.helmet, { metalness: 0.3, roughness: 0.5 }), 0, 0.06, 0);
    h.scale.y = 0.92;
    head.add(h);
  }
  if (o.crest) head.add(mesh(new THREE.BoxGeometry(0.06, 0.22, 0.52), mat(o.crest), 0, 0.38, -0.02));
  if (o.crown) {
    head.add(mesh(GEO.ring, mat('#e2b445', { metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide }), 0, 0.25, 0));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      head.add(mesh(GEO.spike, GOLD, Math.sin(a) * 0.3, 0.36, Math.cos(a) * 0.3));
    }
  }
  if (o.feathers) {
    head.add(mesh(GEO.ring, mat('#9c2f22', { side: THREE.DoubleSide }), 0, 0.14, 0));
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const f = mesh(GEO.feather, mat('#efe3c4'), Math.sin(a) * 0.26, 0.36, Math.cos(a) * 0.26);
      f.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35);
      head.add(f);
    }
  }
  if (o.cape) rig.add(mesh(new THREE.BoxGeometry(0.72, 1.15, 0.06), mat(o.cape), 0, 1.2, -0.33));
  if (o.spear) {
    const big = o.spear === 'big';
    const s = new THREE.Group();
    s.position.set(0, -0.62, 0.06);
    s.add(mesh(big ? GEO.bigShaft : GEO.shaft, WOOD, 0, 0.5, 0), mesh(GEO.tip, mat('#7c7f86', { metalness: 0.6, roughness: 0.4 }), 0, big ? 2.2 : 1.9, 0));
    armR.add(s);
  }
  if (o.staff) armL.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.1, 5), mat('#7a5a38'), 0, -0.35, 0.05));
  if (o.bag) rig.add(mesh(new THREE.BoxGeometry(0.24, 0.28, 0.12), mat('#6e4a2c'), 0.36, 1.0, 0.1));
  if (o.shield) armL.add(mesh(new THREE.BoxGeometry(1.0, 1.55, 0.1), mat('#7a5a36'), -0.05, -0.45, 0.32));

  g.position.set(x, H(x, z), z);
  g.rotation.y = yaw;
  scene.add(g);
  return { g, rig, body, legL, legR, armL, armR, phase: 0, seed: rand() * 6, armsUp: false, sling: false };
}

/** Caminar (speed 0..1), respirar y festejar. */
export function animatePerson(p: Person, speed: number, dt: number, t: number): void {
  if (speed > 0.05) {
    p.phase += dt * (5 + 7 * speed);
    const a = Math.sin(p.phase) * 0.75 * Math.min(1, speed * 1.3);
    p.legL.rotation.x = a;
    p.legR.rotation.x = -a;
    p.armL.rotation.x = -a * 0.7;
    if (!p.sling) p.armR.rotation.x = a * 0.7;
    p.rig.position.y = Math.abs(Math.sin(p.phase)) * 0.07;
  } else {
    p.legL.rotation.x *= 0.8;
    p.legR.rotation.x *= 0.8;
    p.armL.rotation.x *= 0.85;
    if (!p.sling) p.armR.rotation.x *= 0.85;
    p.rig.position.y *= 0.8;
  }
  if (p.armsUp) {
    p.armL.rotation.x = -2.7 + Math.sin(t * 9) * 0.2;
    p.armR.rotation.x = -2.7 + Math.cos(t * 9) * 0.2;
  }
  p.body.scale.y = 1 + Math.sin(t * 2 + p.seed) * 0.015;
}

export function removePerson(scene: THREE.Scene, p: Person): void {
  scene.remove(p.g);
}
