import * as THREE from 'three';
import { rand } from '../util/math';
import { softDot } from '../util/materials';

const DUST = 120;

/** Polvo al caer la piedra o el gigante. */
export class Fx {
  private pos = new Float32Array(DUST * 3);
  private vel = new Float32Array(DUST * 3);
  private life = new Float32Array(DUST);
  private next = 0;
  private dustGeo = new THREE.BufferGeometry();

  constructor(scene: THREE.Scene) {
    const dot = softDot();
    this.pos.fill(-999);
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const dust = new THREE.Points(this.dustGeo, new THREE.PointsMaterial({ color: '#e2cfa6', size: 0.7, map: dot, transparent: true, opacity: 0.8, depthWrite: false }));
    dust.frustumCulled = false;
    scene.add(dust);
  }

  dust(x: number, y: number, z: number, n: number, spread: number): void {
    for (let i = 0; i < n; i++) {
      const k = this.next++ % DUST;
      this.pos.set([x + (rand() - 0.5) * spread, y + rand() * 0.3, z + (rand() - 0.5) * spread], k * 3);
      this.vel.set([(rand() - 0.5) * 3, 1 + rand() * 2.2, (rand() - 0.5) * 3], k * 3);
      this.life[k] = 1.2 + rand();
    }
  }

  update(dt: number): void {
    for (let k = 0; k < DUST; k++) {
      if (this.life[k] <= 0) { this.pos[k * 3 + 1] = -999; continue; }
      this.life[k] -= dt;
      this.vel[k * 3 + 1] -= dt * 1.6;
      for (let j = 0; j < 3; j++) { this.pos[k * 3 + j] += this.vel[k * 3 + j] * dt; this.vel[k * 3 + j] *= 0.97; }
    }
    this.dustGeo.attributes.position.needsUpdate = true;
  }
}
