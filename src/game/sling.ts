import * as THREE from 'three';
import { H } from '../world/terrain';
import { clamp } from '../util/math';
import { mat, mesh } from '../util/materials';

export const SPEED = 27;
export const GRAVITY = 20;
const DRAG_SENS = 0.0028;
const PREVIEW_DOTS = 18;
const HEAD_RADIUS = 0.78;

export type MissReason = 'armor' | 'high' | 'low' | 'right' | 'left' | 'long';
export type ShotResult = { kind: 'hit'; at: THREE.Vector3 } | { kind: 'miss'; reason: MissReason; at: THREE.Vector3 };

/**
 * La honda: se apunta arrastrando (yaw = izquierda/derecha, pitch = altura) y la piedra sigue
 * un tiro parabólico real. Muestra el comienzo de la trayectoria para que apuntar sea posible
 * pero no trivial.
 */
export class Sling {
  yaw = 0;
  pitch = 0;
  flying = false;
  readonly forward = new THREE.Vector3();
  readonly right = new THREE.Vector3();
  readonly hand = new THREE.Vector3();
  readonly target = new THREE.Vector3();

  private base = { yaw: 0, pitch: 0 };
  private preview: THREE.InstancedMesh;
  private cord: THREE.Line;
  private spin: THREE.Mesh;
  private stone: THREE.Mesh;
  private pos = new THREE.Vector3();
  private vel = new THREE.Vector3();
  private t = 0;
  private best = Infinity;
  private bestRel = new THREE.Vector3();
  private dummy = new THREE.Object3D();
  private dir = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.preview = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshBasicMaterial({ color: '#fff6dc', transparent: true, opacity: 0.9 }), PREVIEW_DOTS);
    this.preview.frustumCulled = false;
    this.cord = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#3a2a1a' }));
    this.cord.frustumCulled = false;
    this.spin = mesh(new THREE.DodecahedronGeometry(0.11, 0), mat('#d8d2c4'));
    this.stone = mesh(new THREE.DodecahedronGeometry(0.13, 0), mat('#e6e0d2'));
    scene.add(this.preview, this.cord, this.spin, this.stone);
    this.hide();
  }

  /** Base de tiro: desde la mano de David hacia el objetivo. */
  setBasis(px: number, pz: number, target: THREE.Vector3): void {
    this.target.copy(target);
    this.hand.set(px, H(px, pz) + 2.5, pz);
    this.forward.set(target.x - px, 0, target.z - pz).normalize();
    this.right.set(-this.forward.z, 0, this.forward.x);
  }

  /** Apuntado inicial directo a la frente, sin compensar la caída: queda corto a propósito. */
  reset(): void {
    const dist = Math.hypot(this.target.x - this.hand.x, this.target.z - this.hand.z);
    this.yaw = 0.08;
    this.pitch = Math.atan2(this.target.y - this.hand.y, dist) + 0.02;
  }

  beginDrag(): void { this.base = { yaw: this.yaw, pitch: this.pitch }; }

  dragTo(dx: number, dy: number): void {
    this.yaw = clamp(this.base.yaw + dx * DRAG_SENS, -0.5, 0.5);
    this.pitch = clamp(this.base.pitch - dy * DRAG_SENS, -0.1, 0.9);
  }

  /** Ajuste con teclado (flechas). */
  nudge(x: number, y: number, dt: number): void {
    this.yaw = clamp(this.yaw + x * dt * 0.5, -0.5, 0.5);
    this.pitch = clamp(this.pitch - y * dt * 0.4, -0.1, 0.9);
  }

  aimDir(out: THREE.Vector3): THREE.Vector3 {
    out.copy(this.forward).multiplyScalar(Math.cos(this.yaw)).addScaledVector(this.right, Math.sin(this.yaw)).normalize();
    return out.multiplyScalar(Math.cos(this.pitch)).setY(Math.sin(this.pitch)).normalize();
  }

  /** Piedra girando sobre la cabeza y puntos de trayectoria. */
  showAiming(t: number): void {
    const a = t * 13;
    this.spin.position.set(this.hand.x + Math.cos(a) * this.right.x * 0.55, this.hand.y + 0.35 + Math.sin(a) * 0.25, this.hand.z + Math.cos(a) * this.right.z * 0.55);
    const lp = this.cord.geometry.attributes.position as THREE.BufferAttribute;
    lp.setXYZ(0, this.hand.x, this.hand.y, this.hand.z);
    lp.setXYZ(1, this.spin.position.x, this.spin.position.y, this.spin.position.z);
    lp.needsUpdate = true;
    this.spin.visible = this.cord.visible = this.preview.visible = true;

    const v = this.aimDir(this.dir).multiplyScalar(SPEED);
    for (let i = 0; i < PREVIEW_DOTS; i++) {
      const tt = (i + 1) * 0.027;
      this.dummy.position.set(this.hand.x + v.x * tt, this.hand.y + v.y * tt - 0.5 * GRAVITY * tt * tt, this.hand.z + v.z * tt);
      this.dummy.scale.setScalar(1 - i * 0.04);
      this.dummy.updateMatrix();
      this.preview.setMatrixAt(i, this.dummy.matrix);
    }
    this.preview.instanceMatrix.needsUpdate = true;
  }

  hide(): void {
    this.spin.visible = this.cord.visible = this.preview.visible = false;
    if (!this.flying) this.stone.visible = false;
  }

  launch(): void {
    this.pos.copy(this.hand);
    this.vel.copy(this.aimDir(this.dir)).multiplyScalar(SPEED);
    this.t = 0;
    this.best = Infinity;
    this.flying = true;
    this.stone.visible = true;
    this.spin.visible = this.cord.visible = this.preview.visible = false;
  }

  /** Avanza la piedra. Devuelve el resultado cuando impacta o se pierde. */
  step(dt: number, hitsBody: (p: THREE.Vector3) => boolean): ShotResult | null {
    if (!this.flying) return null;
    const steps = 4, h = dt / steps;
    for (let s = 0; s < steps; s++) {
      this.vel.y -= GRAVITY * h;
      this.pos.addScaledVector(this.vel, h);
      this.t += h;
      const d = this.pos.distanceTo(this.target);
      if (d < this.best) { this.best = d; this.bestRel.subVectors(this.pos, this.target); }
      if (d < HEAD_RADIUS) return this.finish({ kind: 'hit', at: this.pos.clone() });
      if (hitsBody(this.pos)) return this.finish({ kind: 'miss', reason: 'armor', at: this.pos.clone() });
      if (this.pos.y < H(this.pos.x, this.pos.z) || this.t > 2.2) {
        const rel = this.bestRel, side = rel.x * this.right.x + rel.z * this.right.z;
        const reason: MissReason = rel.y > 0.7 ? 'high' : rel.y < -0.7 ? 'low' : side > 0.5 ? 'right' : side < -0.5 ? 'left' : 'long';
        return this.finish({ kind: 'miss', reason, at: this.pos.clone() });
      }
    }
    this.stone.position.copy(this.pos);
    this.stone.rotation.x += dt * 20;
    return null;
  }

  /** Inclinación que da en el blanco con yaw = 0 (para pruebas automáticas). */
  solve(): number {
    const dist = Math.hypot(this.target.x - this.hand.x, this.target.z - this.hand.z), dy = this.target.y - this.hand.y;
    let best = 0, err = Infinity;
    for (let p = -0.1; p < 0.9; p += 0.002) {
      const vx = SPEED * Math.cos(p), t = dist / vx, y = SPEED * Math.sin(p) * t - 0.5 * GRAVITY * t * t;
      if (Math.abs(y - dy) < err) { err = Math.abs(y - dy); best = p; }
    }
    return best;
  }

  private finish(r: ShotResult): ShotResult {
    this.flying = false;
    this.stone.visible = false;
    return r;
  }
}
