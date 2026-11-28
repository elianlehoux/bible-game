import * as THREE from 'three';
import { H } from '../world/ground';
import { createCamino, px, DESCANSOS, DERRUMBE, ARROYO, CORNISA, CANALETAS, CANALETA_TOP, Z_END, enElAgua, alBarranco, type Camino } from '../world/camino';
import { DAVID_CARGA } from '../content/comun';
import { DIALOGOS as D, MISION, RELOJ, TIEMPO, ZONAS, AVISOS, ENTRADA } from '../content/nivel3';
import { mat, mesh } from '../util/materials';
import { Fx } from '../game/fx';
import type { CamShot, Level, LevelCtx, LevelDef, Target } from './types';

type Caida = 'roca' | 'agua' | 'barranco' | 'tarde';
type Zona = keyof typeof ZONAS;
type Paso = 'derrumbe' | 'arroyo' | 'cornisa';
interface Roca { m: THREE.Mesh; r: number; x: number; z: number; on: boolean; dusted: boolean }

/** Cuánto antes de soltarse la piedra se ve el polvo arriba. */
const WARN = 1.3;
const ROCK_SPEED = 9;
/** Hasta dónde rueda (del otro lado del camino). */
const ROCK_END = -10;
/** Segundos mínimos que se devuelven si se acaba el tiempo. */
const MIN_RETRY = 45;
/** Dónde se avisa cada paso difícil (antes de llegar). */
const AVISO_Z: Record<Paso, number> = { derrumbe: DERRUMBE.z0 + 5, arroyo: ARROYO.z + ARROYO.half + 13, cornisa: CORNISA.z0 + 7 };

export const nivel3: LevelDef = {
  n: 3,
  titulo: 'Camino al valle de Ela',
  ref: '1 Samuel 17:20',
  resumen: 'Baja de los montes de Judá con la carga. Hay piedras que caen, un arroyo crecido y una cornisa angosta. Llega antes de que el ejército salga a la batalla.',
  entrada: ENTRADA,
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
  private avisado = new Set<Paso>();
  private rocas: Roca[];
  /** Reloj de las canaletas: se detiene con los diálogos y las caídas. */
  private clock = 0;
  private wetT = 0;
  private falling = false;
  private done = false;
  private started = false;
  private endT = -1;
  private fx: Fx;
  private shot: CamShot = { pos: new THREE.Vector3(), look: new THREE.Vector3(), rate: 0.8 };

  constructor(private ctx: LevelCtx) {
    this.world = createCamino(ctx.lowEnd);
    this.fx = new Fx(this.world.scene);
    this.rocas = CANALETAS.map((c, i) => {
      const r = 0.72 + (i % 2) * 0.2;
      const m = mesh(new THREE.DodecahedronGeometry(r, 0), mat('#b9ad92'));
      m.visible = false;
      this.world.scene.add(m);
      return { m, r, x: 0, z: c.z, on: false, dusted: false };
    });
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

  camera(): CamShot | null {
    if (this.endT < 0) return null;
    // Llegada: la cámara sube detrás de David y muestra el campamento abajo.
    const pl = this.ctx.player, y = H(pl.x, pl.z);
    this.shot.pos.set(pl.x + 3, y + 7, pl.z + 9);
    this.shot.look.set(px(-244), H(px(-244), -244) + 1, -244);
    return this.shot;
  }

  private setZona(z: Zona): void {
    if (this.zona === z) return;
    this.zona = z;
    const info: { nombre: string; sub?: string } = ZONAS[z];
    this.ctx.hud.area(info.nombre, info.sub);
  }

  update(dt: number): void {
    const pl = this.ctx.player;
    this.fx.update(dt);
    const paused = this.ctx.dialog.open || this.falling || !this.started || this.done;
    if (!paused) this.clock += dt;
    this.updateRocas(dt);
    if (this.endT >= 0 && (this.endT += dt) > 3.2) { this.endT = -2; this.ctx.complete(); }
    if (this.done || !this.started) { this.ctx.hud.timer(this.done ? null : this.time, RELOJ); return; }

    if (!paused) this.time -= dt;
    this.ctx.hud.timer(this.time, RELOJ);

    // Zonas, avisos y descansos.
    const z = pl.z;
    this.setZona(z < Z_END + 14 ? 'fin' : z < CORNISA.z0 + 4 && z > CORNISA.z1 - 2 ? 'cornisa' : Math.abs(z - ARROYO.z) < ARROYO.half + 5 ? 'arroyo' : z < DERRUMBE.z0 + 4 && z > DERRUMBE.z1 ? 'derrumbe' : 'inicio');
    for (const paso of ['derrumbe', 'arroyo', 'cornisa'] as const) {
      if (z < AVISO_Z[paso] && !this.avisado.has(paso) && !this.ctx.dialog.open) {
        this.avisado.add(paso);
        this.ctx.dialog.say(D[paso]);
      }
    }
    for (let i = this.cp + 1; i < DESCANSOS.length; i++) {
      if (z < DESCANSOS[i].z) {
        this.cp = i;
        this.cpTime = this.time;
        this.ctx.hud.toast(AVISOS.descanso, 2.4);
      }
    }
    if (this.falling || this.ctx.dialog.open) return;

    // Peligros.
    if (enElAgua(pl.x, pl.z)) {
      this.wetT += dt;
      if (this.wetT > 0.3) return this.fall('agua');
    } else this.wetT = 0;
    if (alBarranco(pl.x, pl.z)) return this.fall('barranco');
    if (this.time <= 0) return this.fall('tarde');
    for (const r of this.rocas) {
      if (r.on && Math.hypot(r.x - pl.x, r.z - pl.z) < r.r + 0.4) return this.fall('roca');
    }

    if (z < Z_END) {
      this.done = true;
      this.ctx.hud.timer(null);
      this.ctx.dialog.say(D.llegada, () => { this.endT = 0; });
    }
  }

  /**
   * Cada canaleta suelta una piedra con su propio ritmo: polvo arriba, después la piedra rueda
   * cruzando el camino. Solo se ven las que están cerca de David.
   */
  private updateRocas(dt: number): void {
    const pl = this.ctx.player;
    CANALETAS.forEach((c, i) => {
      const r = this.rocas[i], near = Math.abs(pl.z - c.z) < 40 && pl.z < DERRUMBE.z0 + 30;
      const t = (this.clock + c.offset) % c.period, top = px(c.z) + CANALETA_TOP;
      if (!near) { r.on = false; r.m.visible = false; return; }
      if (t < WARN) {
        // Aviso: polvo y piedritas arriba de la canaleta.
        r.on = false;
        r.m.visible = true;
        r.x = top;
        r.m.position.set(top, H(top, c.z) + r.r * 0.8, c.z);
        if (!r.dusted && !this.ctx.dialog.open) { r.dusted = true; this.fx.dust(top, H(top, c.z) + 0.6, c.z, 10, 1.3); }
        if (t > WARN * 0.55 && t - dt <= WARN * 0.55) this.fx.dust(top - 1, H(top - 1, c.z) + 0.4, c.z, 6, 0.8);
        return;
      }
      r.dusted = false;
      r.x = top - (t - WARN) * ROCK_SPEED;
      const end = px(c.z) + ROCK_END;
      r.on = r.x > end;
      r.m.visible = r.on;
      if (!r.on) return;
      r.m.position.set(r.x, H(r.x, c.z) + r.r * 0.8, c.z);
      r.m.rotation.z += dt * (ROCK_SPEED / r.r) * (this.ctx.dialog.open ? 0 : 1);
    });
  }

  private fall(kind: Caida): void {
    if (this.falling) return;
    this.falling = true;
    const pl = this.ctx.player;
    if (kind === 'roca') { this.ctx.shake(0.4); this.fx.dust(pl.x, H(pl.x, pl.z) + 0.5, pl.z, 14, 1); }
    this.ctx.hud.toast(AVISOS[kind], 2.8, true);
    setTimeout(() => this.ctx.fade(() => {
      const d = DESCANSOS[this.cp];
      pl.teleport(d.x, d.z, Math.PI);
      this.ctx.snapCamera();
      if (kind === 'tarde') this.time = Math.max(this.cpTime, MIN_RETRY);
      this.wetT = 0;
      this.falling = false;
    }), kind === 'roca' ? 700 : 500);
  }

  debug() {
    return {
      time: this.time, cp: this.cp, falling: this.falling, done: this.done, zona: this.zona, clock: this.clock,
      descansos: DESCANSOS, vado: this.world.vado.map((v) => ({ x: v.position.x, z: v.position.z, y: v.position.y })),
      rocas: this.rocas.map((r) => ({ x: r.x, z: r.z, on: r.on })),
      setTime: (t: number) => { this.time = t; },
      cornisa: CORNISA,
    };
  }
}
