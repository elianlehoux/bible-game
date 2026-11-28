import * as THREE from 'three';
import { H } from '../world/ground';
import { createCamino, px, DESCANSOS, DERRUMBE, ARROYO, CORNISA, Z_END, enElAgua, alBarranco, type Camino } from '../world/camino';
import { DAVID_CARGA } from '../content/comun';
import { DIALOGOS as D, MISION, RELOJ, TIEMPO, ZONAS, AVISOS } from '../content/nivel3';
import { rand } from '../util/math';
import { mat, mesh } from '../util/materials';
import { Fx } from '../game/fx';
import type { Level, LevelCtx, LevelDef, Target } from './types';

type Caida = 'roca' | 'agua' | 'barranco' | 'tarde';
type Zona = keyof typeof ZONAS;
interface Roca { m: THREE.Mesh; on: boolean; warn: number; x: number; z: number; r: number }

const ROCK_SPEED = 9.5;
/** Segundos mínimos que se devuelven si se acaba el tiempo. */
const MIN_RETRY = 45;

export const nivel3: LevelDef = {
  n: 3,
  titulo: 'Camino al valle de Ela',
  ref: '1 Samuel 17:20',
  resumen: 'Baja de los montes de Judá con la carga. Hay piedras que caen, un arroyo crecido y una cornisa angosta. Llega antes de que el ejército salga a la batalla.',
  create: (ctx) => new Viaje(ctx),
};

class Viaje implements Level {
  world: Camino;
  start = { x: DESCANSOS[0].x, z: DESCANSOS[0].z, yaw: Math.PI };
  look = DAVID_CARGA;

  private time = TIEMPO;
  private cp = 0;
  private cpTime = TIEMPO;
  private zona: Zona | '' = '';
  private told = new Set<string>();
  private rocas: Roca[] = [];
  private spawnT = 0;
  private wetT = 0;
  private falling = false;
  private done = false;
  private started = false;
  private fx: Fx;

  constructor(private ctx: LevelCtx) {
    this.world = createCamino(ctx.lowEnd);
    this.fx = new Fx(this.world.scene);
    for (let i = 0; i < 6; i++) {
      const r = 0.7 + rand() * 0.35;
      const m = mesh(new THREE.DodecahedronGeometry(r, 0), mat('#b9ad92'));
      m.visible = false;
      this.world.scene.add(m);
      this.rocas.push({ m, on: false, warn: 0, x: 0, z: 0, r });
    }
  }

  begin(): void {
    this.ctx.player.speed = 0.95;
    this.setZona('inicio');
    this.ctx.quest(MISION);
    this.ctx.dialog.say(D.intro, () => { this.started = true; });
  }

  targets(): Target[] { return []; }
  interact(): void { /* nada con qué interactuar */ }
  canMove(): boolean { return !this.falling && !this.done; }

  private setZona(z: Zona): void {
    if (this.zona === z) return;
    this.zona = z;
    const info: { nombre: string; sub?: string } = ZONAS[z];
    this.ctx.hud.area(info.nombre, info.sub);
    const hint = (AVISOS as Record<string, string>)[z];
    if (hint && !this.told.has(z)) { this.told.add(z); setTimeout(() => this.ctx.hud.toast(hint, 3.2), 900); }
  }

  update(dt: number): void {
    const pl = this.ctx.player;
    this.fx.update(dt);
    this.updateRocas(dt);
    if (this.done || !this.started) { this.ctx.hud.timer(this.done ? null : this.time, RELOJ); return; }

    if (!this.ctx.dialog.open && !this.falling) this.time -= dt;
    this.ctx.hud.timer(this.time, RELOJ);

    // Zonas y descansos.
    const z = pl.z;
    this.setZona(z < Z_END + 14 ? 'fin' : z < CORNISA.z0 + 4 && z > CORNISA.z1 - 2 ? 'cornisa' : Math.abs(z - ARROYO.z) < ARROYO.half + 5 ? 'arroyo' : z < DERRUMBE.z0 + 4 && z > DERRUMBE.z1 ? 'derrumbe' : 'inicio');
    for (let i = this.cp + 1; i < DESCANSOS.length; i++) {
      if (z < DESCANSOS[i].z) {
        this.cp = i;
        this.cpTime = this.time;
        this.ctx.hud.toast(AVISOS.descanso, 2);
      }
    }
    if (this.falling) return;

    // Peligros.
    if (enElAgua(pl.x, pl.z)) {
      this.wetT += dt;
      if (this.wetT > 0.3) return this.fall('agua');
    } else this.wetT = 0;
    if (alBarranco(pl.x, pl.z)) return this.fall('barranco');
    if (this.time <= 0) return this.fall('tarde');

    if (z < Z_END) {
      this.done = true;
      this.ctx.hud.timer(null);
      this.ctx.dialog.say(D.llegada, () => this.ctx.complete());
    }
  }

  /** Piedras que ruedan por la ladera, cruzando el camino delante de David. */
  private updateRocas(dt: number): void {
    const pl = this.ctx.player;
    const inside = pl.z < DERRUMBE.z0 + 6 && pl.z > DERRUMBE.z1 - 2;
    this.spawnT -= dt;
    if (inside && this.spawnT <= 0 && !this.falling) {
      this.spawnT = 0.9 + rand() * 0.8;
      const r = this.rocas.find((k) => !k.on);
      if (r) {
        r.on = true;
        r.warn = 0.85;
        r.z = Math.min(DERRUMBE.z0, Math.max(DERRUMBE.z1, pl.z - 2 - rand() * 9));
        r.x = px(r.z) + 15;
        r.m.visible = true;
        r.m.position.set(r.x, H(r.x, r.z) + r.r, r.z);
        this.fx.dust(r.x, H(r.x, r.z) + 0.5, r.z, 8, 1.2);
      }
    }
    for (const r of this.rocas) {
      if (!r.on) continue;
      if (r.warn > 0) { r.warn -= dt; continue; }
      r.x -= ROCK_SPEED * dt;
      r.m.position.set(r.x, H(r.x, r.z) + r.r * 0.8, r.z);
      r.m.rotation.z += dt * (ROCK_SPEED / r.r);
      if (!this.falling && Math.hypot(r.x - pl.x, r.z - pl.z) < r.r + 0.4) this.fall('roca');
      if (r.x < px(r.z) - 16) { r.on = false; r.m.visible = false; }
    }
  }

  private fall(kind: Caida): void {
    if (this.falling) return;
    this.falling = true;
    const pl = this.ctx.player;
    if (kind === 'roca') { this.ctx.shake(0.4); this.fx.dust(pl.x, H(pl.x, pl.z) + 0.5, pl.z, 14, 1); }
    this.ctx.hud.toast(AVISOS[kind], 2.8);
    setTimeout(() => this.ctx.fade(() => {
      const d = DESCANSOS[this.cp];
      pl.teleport(d.x, d.z, Math.PI);
      this.ctx.snapCamera();
      if (kind === 'tarde') this.time = Math.max(this.cpTime, MIN_RETRY);
      this.wetT = 0;
      for (const r of this.rocas) { r.on = false; r.m.visible = false; }
      this.spawnT = 1.5;
      this.falling = false;
    }), kind === 'roca' ? 450 : 250);
  }

  debug() {
    return {
      time: this.time, cp: this.cp, falling: this.falling, done: this.done, zona: this.zona,
      descansos: DESCANSOS, vado: this.world.vado.map((v) => ({ x: v.position.x, z: v.position.z, y: v.position.y })),
      setTime: (t: number) => { this.time = t; },
      cornisa: CORNISA,
    };
  }
}
