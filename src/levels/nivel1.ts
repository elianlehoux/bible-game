import * as THREE from 'three';
import { H, type Collider, type Point, type World } from '../world/ground';
import { createBelen, REDIL, GUARIDA, MATORRAL, OVEJAS } from '../world/belen';
import { createSheep, updateSheep, type Sheep } from '../actors/sheep';
import { createLion, animateLion, type Lion } from '../actors/lion';
import { DAVID } from '../content/comun';
import { DIALOGOS as D, MISIONES, AVISOS } from '../content/nivel1';
import { lerpAngle, rand } from '../util/math';
import { Fx } from '../game/fx';
import type { CamShot, Level, LevelCtx, LevelDef, Target } from './types';

type Stage = 'juntar' | 'leon' | 'perseguir' | 'pelea' | 'volver' | 'fin';
type Flock = Sheep & { state: 'graze' | 'follow' | 'pen' | 'carried' | 'loose'; lamb: boolean; order: number };
/**
 * El león: primero una escena que se ve entera (sale del matorral, ruge, entra al redil y agarra
 * un cordero); después huye, y al alcanzarlo pelea.
 */
type LionMode = 'hidden' | 'emerge' | 'roar' | 'rush' | 'grab' | 'exit' | 'wait' | 'flee' | 'circle' | 'crouch' | 'pounce' | 'hurt' | 'recover' | 'down';
const SCENE_MODES: LionMode[] = ['emerge', 'roar', 'rush', 'grab', 'exit'];

const FOLLOW_R = 3.4;
const SWING_TIME = 0.35;
/** Cuánto dura el agazapado antes del salto, y desde cuándo un golpe le da. */
const CROUCH_TIME = 1.1, HIT_FROM = 0.4, HIT_R = 3.6;
/** Pausa tranquila entre juntar la última oveja y que aparezca el león. */
const CALM = 3.2;
/** Donde el león sale de entre las matas. */
const HIDE_OUT: Point = { x: MATORRAL.x + 2.6, z: MATORRAL.z - 2.4 };
/** Vuelta que hace el león con el cordero, entre el redil y su guarida. */
const ROUTE: Point[] = [{ x: -2, z: 15 }, { x: -13, z: 22 }, { x: -23, z: 26 }, { x: -30, z: 20 }, { x: -24, z: 10 }, { x: -12, z: 12 }];

export const nivel1: LevelDef = {
  n: 1,
  titulo: 'El pastor de Belén',
  ref: '1 Samuel 16:11; 17:34–37',
  resumen: 'Junta las ovejas de tu padre en el redil antes de que caiga la tarde. Si viene una fiera, defiende el rebaño con tu cayado.',
  create: (ctx) => new Pastor(ctx),
};

const inPen = (x: number, z: number, pad = 0): boolean => Math.hypot(x - REDIL.x, z - REDIL.z) < REDIL.r - pad;
/** Punto justo afuera de la entrada del redil. */
const GATE: Point = { x: REDIL.x + Math.cos(REDIL.gap) * (REDIL.r + 1.6), z: REDIL.z + Math.sin(REDIL.gap) * (REDIL.r + 1.6) };
/** Punto justo adentro de la entrada. */
const GATE_IN: Point = { x: REDIL.x + Math.cos(REDIL.gap) * (REDIL.r - 1.8), z: REDIL.z + Math.sin(REDIL.gap) * (REDIL.r - 1.8) };
/** Radio por el que se rodea el muro por fuera. */
const AROUND_R = REDIL.r + 1.7;

const angleOf = (x: number, z: number): number => Math.atan2(z - REDIL.z, x - REDIL.x);
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Distancia del centro del redil al segmento (ax,az)–(bx,bz). */
function centerToSeg(ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((REDIL.x - ax) * dx + (REDIL.z - az) * dz) / l2)) : 0;
  return Math.hypot(ax + dx * t - REDIL.x, az + dz * t - REDIL.z);
}

/**
 * Próximo punto al que camina algo que está afuera del redil para llegar a (tx, tz) sin atravesar
 * el muro: lo rodea por fuera y entra por la abertura.
 */
function rodear(x: number, z: number, tx: number, tz: number): Point {
  const r = Math.hypot(x - REDIL.x, z - REDIL.z);
  if (r < REDIL.r - 0.4) return { x: tx, z: tz }; // ya está adentro
  const inside = Math.hypot(tx - REDIL.x, tz - REDIL.z) < REDIL.r + 0.3;
  const sa = angleOf(x, z);
  if (inside) {
    // Frente a la abertura: entra derecho. Si no, primero va hasta la entrada.
    if (Math.abs(wrap(sa - REDIL.gap)) < REDIL.gapHalf * 0.8 && r < REDIL.r + 2.6) return GATE_IN;
    tx = GATE.x; tz = GATE.z;
    if (Math.hypot(x - GATE.x, z - GATE.z) < 0.8) return GATE_IN;
  }
  // Si el camino directo choca con el muro, da la vuelta por fuera.
  if (centerToSeg(x, z, tx, tz) > REDIL.r + 0.9) return { x: tx, z: tz };
  const diff = wrap(angleOf(tx, tz) - sa), a = sa + Math.sign(diff) * Math.min(Math.abs(diff), 0.6);
  return { x: REDIL.x + Math.cos(a) * AROUND_R, z: REDIL.z + Math.sin(a) * AROUND_R };
}
/** Donde el león se detiene al salir del redil, ya con el cordero. */
const EXIT: Point = { x: GATE.x - 2.5, z: GATE.z + 2 };

class Pastor implements Level {
  world: World;
  start = { x: 0, z: 12, yaw: Math.PI * 0.8 };
  look = DAVID;

  private stage: Stage = 'juntar';
  private flock: Flock[];
  private lion: Lion;
  private lionMode: LionMode = 'hidden';
  private lionT = 0;
  private lionWp = 0;
  private pounceDir = new THREE.Vector3();
  private pounceLeft = 0;
  private pounceTotal = 1;
  private knock = new THREE.Vector3();
  private hits = 0;
  private circleFor = 2;
  /** Cuenta regresiva tranquila antes del león (-1 = todavía no empezó). */
  private calm = -1;
  /** Toma final del redil (-1 = todavía no). */
  private endT = -1;
  private lamb: Flock | null = null;
  private swing = 0;
  private told = { sigue: false, entrada: false, golpea: false, espera: false };
  private fx: Fx;
  private ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private shot: CamShot = { pos: new THREE.Vector3(), look: new THREE.Vector3(), rate: 2.5 };

  constructor(private ctx: LevelCtx) {
    this.world = createBelen(ctx.lowEnd, 'tarde');
    const scene = this.world.scene;
    this.fx = new Fx(scene);
    this.flock = OVEJAS.map((o, i) => {
      const s = createSheep(scene, o.x, o.z, o.cordero ? 0.6 : 1) as Flock;
      s.state = 'graze';
      s.lamb = !!o.cordero;
      s.order = i;
      s.roam = 3;
      return s;
    });
    this.lion = createLion(scene, GUARIDA.x, GUARIDA.z, 0);
    this.lion.g.visible = false;
    // Círculo en el suelo que avisa el salto del león: se cierra y se pone rojo cuando hay que golpear.
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.86, 1, 40),
      new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    scene.add(this.ring);
  }

  begin(): void {
    this.ctx.hud.area('Campos de Belén', 'Belén de Judá');
    this.updateQuest();
    this.ctx.dialog.say(D.intro);
  }

  private penned(): number { return this.flock.filter((s) => s.state === 'pen').length; }

  private updateQuest(): void {
    const s = this.stage;
    if (s === 'juntar') this.ctx.quest(MISIONES.juntar, [this.penned(), this.flock.length]);
    else if (s === 'leon') this.ctx.quest(MISIONES.leon);
    else if (s === 'perseguir') this.ctx.quest(MISIONES.perseguir);
    else if (s === 'pelea') this.ctx.quest(MISIONES.pelea, [this.hits, 3]);
    else if (s === 'volver') this.ctx.quest(MISIONES.volver);
    else this.ctx.quest(MISIONES.fin);
  }

  targets(): Target[] { return []; }
  interact(): void { /* en este nivel no hay con quién hablar */ }

  /** El león está por saltar o saltando: un golpe ahora le da. */
  private inWindow(): boolean {
    return this.stage === 'pelea' && ((this.lionMode === 'crouch' && this.lionT > HIT_FROM) || this.lionMode === 'pounce');
  }

  action(): { label: string; run(): void } | null {
    if (this.stage === 'pelea' && this.lionMode !== 'down') return { label: this.inWindow() ? '¡Ahora!' : 'Golpear', run: () => this.strike() };
    if (this.stage === 'perseguir' && this.lionMode === 'flee' && this.lionDist() < 2.8) return { label: 'Golpear', run: () => this.strike() };
    return null;
  }

  canMove(): boolean { return !SCENE_MODES.includes(this.lionMode) && this.lionMode !== 'wait' && this.endT < 0; }

  camera(): CamShot | null {
    const p = this.lion.g.position;
    if (this.lionMode === 'emerge' || this.lionMode === 'roar') {
      // Cerca del matorral, mirando al león de frente.
      const cx = HIDE_OUT.x + 5.5, cz = HIDE_OUT.z - 6;
      this.shot.pos.set(cx, H(cx, cz) + 2.4, cz);
      this.shot.look.set(p.x, p.y + 1.1, p.z);
      this.shot.rate = 3;
      return this.shot;
    }
    if (this.lionMode === 'rush' || this.lionMode === 'grab' || this.lionMode === 'exit' || this.lionMode === 'wait') {
      // De costado, para ver la carrera hasta el redil y lo que pasa adentro.
      const cx = -5, cz = 0;
      this.shot.pos.set(cx, H(cx, cz) + 7, cz);
      this.shot.look.set(p.x * 0.6 + REDIL.x * 0.4, p.y + 0.8, p.z * 0.6 + REDIL.z * 0.4);
      this.shot.rate = 2.2;
      return this.shot;
    }
    if (this.endT >= 0) {
      // Final: el redil al atardecer, desde arriba.
      const cx = REDIL.x - 10, cz = REDIL.z + 10;
      this.shot.pos.set(cx, H(cx, cz) + 8, cz);
      this.shot.look.set(REDIL.x, H(REDIL.x, REDIL.z) + 0.5, REDIL.z);
      this.shot.rate = 0.7;
      return this.shot;
    }
    return null;
  }

  colliders(): Collider[] {
    const out: Collider[] = [];
    for (const s of this.flock) if (s.state !== 'carried') out.push({ x: s.g.position.x, z: s.g.position.z, r: s.lamb ? 0.35 : 0.55 });
    const solid = this.lion.g.visible && (this.lionMode === 'circle' || this.lionMode === 'recover' || this.lionMode === 'crouch' || this.lionMode === 'flee');
    if (solid) out.push({ x: this.lion.g.position.x, z: this.lion.g.position.z, r: 1.0 });
    return out;
  }

  // ---------- Ciclo ----------

  update(dt: number): void {
    if (this.swing > 0) this.swing -= dt;
    this.animateSwing();
    this.updateFlock(dt);
    this.updateLion(dt);
    this.updateRing();
    this.fx.update(dt);
    const open = this.ctx.dialog.open;
    // Todas adentro: un momento de calma antes del león, para que se lea el aviso.
    if (this.stage === 'juntar' && this.penned() === this.flock.length && !open) {
      if (this.calm < 0) { this.calm = CALM; this.ctx.hud.toast(AVISOS.todas, 2.8); }
      else if ((this.calm -= dt) <= 0) this.lionAttack();
    }
    if (this.endT >= 0 && (this.endT += dt) > 3.4) { this.endT = -2; this.ctx.complete(); }
  }

  private animateSwing(): void {
    const arm = this.ctx.player.person.armL;
    if (this.swing > 0) {
      // Levanta el cayado y lo baja con fuerza.
      const k = 1 - this.swing / SWING_TIME;
      arm.rotation.x = k < 0.4 ? -2.6 * (k / 0.4) : -2.6 + 3.2 * ((k - 0.4) / 0.6);
    }
  }

  // ---------- Ovejas ----------

  private updateFlock(dt: number): void {
    const pl = this.ctx.player, T = this.ctx.T;
    let followers = 0;
    for (const s of this.flock) {
      const p = s.g.position;
      if (s.state === 'carried') continue;
      if (s.state === 'graze' && Math.hypot(p.x - pl.x, p.z - pl.z) < FOLLOW_R && this.stage === 'juntar') {
        s.state = 'follow';
        if (!this.told.sigue) { this.told.sigue = true; this.ctx.hud.toast(AVISOS.sigue, 2.6); }
      }
      if (s.state === 'loose' && Math.hypot(p.x - pl.x, p.z - pl.z) < FOLLOW_R && this.stage === 'volver') s.state = 'follow';
      if (s.state === 'follow') {
        const k = followers++;
        // Sigue a David sin atravesar el muro: lo rodea y entra por la abertura.
        const wp = rodear(p.x, p.z, pl.x, pl.z), toDavid = wp.x === pl.x && wp.z === pl.z;
        const tx = wp.x, tz = wp.z;
        const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz), keep = toDavid ? 1.8 + k * 0.45 : 0;
        if (d > keep) {
          const v = Math.min(d - keep, dt * (d > 6 ? 7 : 5));
          let nx = p.x + (dx / d) * v, nz = p.z + (dz / d) * v;
          [nx, nz] = this.push(s, nx, nz);
          p.x = nx; p.z = nz;
          s.g.rotation.y = lerpAngle(s.g.rotation.y, Math.atan2(dx, dz), 0.15);
        }
        p.y = H(p.x, p.z) + Math.abs(Math.sin(T * 9 + s.order)) * 0.06;
        if (inPen(p.x, p.z, 0.9) && (this.stage === 'juntar' || (this.stage === 'volver' && s === this.lamb))) this.pen(s);
        continue;
      }
      updateSheep(s, dt, T);
      [p.x, p.z] = this.push(s, p.x, p.z);
    }
    if (!this.told.entrada && followers > 0 && Math.hypot(pl.x - REDIL.x, pl.z - REDIL.z) < REDIL.r + 3 && !inPen(pl.x, pl.z)) {
      this.told.entrada = true;
      this.ctx.hud.toast(AVISOS.entrada, 2.4);
    }
  }

  /** Empuja a la oveja fuera de muros, árboles y otras ovejas. */
  private push(s: Flock, x: number, z: number): [number, number] {
    const r = s.lamb ? 0.35 : 0.5;
    for (const c of this.world.colliders) {
      const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
      if (d < m && d > 1e-4) { x = c.x + (dx / d) * m; z = c.z + (dz / d) * m; }
    }
    for (const o of this.flock) {
      if (o === s || o.state === 'carried') continue;
      const dx = x - o.g.position.x, dz = z - o.g.position.z, d = Math.hypot(dx, dz);
      if (d < 0.9 && d > 1e-4) { x += (dx / d) * (0.9 - d) * 0.5; z += (dz / d) * (0.9 - d) * 0.5; }
    }
    return this.world.clamp(x, z);
  }

  private pen(s: Flock): void {
    s.state = 'pen';
    const a = rand() * Math.PI * 2, r = rand() * (REDIL.r - 2.2);
    s.home = { x: REDIL.x + Math.cos(a) * r, z: REDIL.z + Math.sin(a) * r };
    s.tx = s.home.x; s.tz = s.home.z;
    s.roam = 1.2;
    if (this.stage === 'juntar') this.updateQuest();
    if (this.stage === 'volver' && s === this.lamb) this.finish();
  }

  // ---------- El león ----------

  private lionDist(): number {
    const p = this.lion.g.position;
    return Math.hypot(p.x - this.ctx.player.x, p.z - this.ctx.player.z);
  }

  /** Aviso en el diálogo y después la escena: el león sale del matorral y va por un cordero. */
  private lionAttack(): void {
    this.stage = 'leon';
    this.updateQuest();
    this.lamb = this.flock.find((s) => s.lamb && s.state === 'pen') ?? this.flock[0];
    this.ctx.dialog.say(D.acecho, () => {
      const L = this.lion;
      L.g.visible = true;
      L.g.position.set(MATORRAL.x, H(MATORRAL.x, MATORRAL.z), MATORRAL.z);
      L.g.rotation.y = Math.atan2(HIDE_OUT.x - MATORRAL.x, HIDE_OUT.z - MATORRAL.z);
      L.crouch = 0.5;
      this.setLion('emerge');
    });
  }

  private moveLion(tx: number, tz: number, speed: number, dt: number): number {
    const p = this.lion.g.position, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    if (d > 0.01) {
      const v = Math.min(d, speed * dt);
      p.x += (dx / d) * v;
      p.z += (dz / d) * v;
      this.lion.g.rotation.y = lerpAngle(this.lion.g.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-dt * 8));
    }
    p.y = H(p.x, p.z);
    return d;
  }

  private faceDavid(dt: number, rate = 6): void {
    const p = this.lion.g.position, pl = this.ctx.player;
    this.lion.g.rotation.y = lerpAngle(this.lion.g.rotation.y, Math.atan2(pl.x - p.x, pl.z - p.z), 1 - Math.exp(-dt * rate));
  }

  private updateLion(dt: number): void {
    const L = this.lion, pl = this.ctx.player, m = this.lionMode;
    if (!L.g.visible) return;
    // Mientras se lee un diálogo, el león espera (no ataca por detrás del texto).
    if (this.ctx.dialog.open && m !== 'wait' && m !== 'down') { animateLion(L, 0, dt, this.ctx.T); return; }
    this.lionT += dt;
    if (m !== 'pounce') L.leap = Math.max(0, L.leap - dt * 5);
    if (m !== 'crouch' && m !== 'pounce' && m !== 'emerge') L.crouch = Math.max(0, L.crouch - dt * 3);
    let speed = 0;
    switch (m) {
      case 'emerge': {
        // Sale despacio de entre las matas, agazapado.
        const d = this.moveLion(HIDE_OUT.x, HIDE_OUT.z, 1.5, dt);
        speed = d > 0.05 ? 0.25 : 0;
        if (d <= 0.05 && this.lionT > 1.6) this.setLion('roar');
        break;
      }
      case 'roar': {
        const p = L.g.position;
        L.g.rotation.y = lerpAngle(L.g.rotation.y, Math.atan2(GATE.x - p.x, GATE.z - p.z), 1 - Math.exp(-dt * 4));
        L.roar = Math.sin(Math.min(1, this.lionT / 1.5) * Math.PI);
        if (this.lionT > 0.4 && this.lionT - dt <= 0.4) this.ctx.shake(0.35);
        if (this.lionT > 1.8) { L.roar = 0; this.lionWp = 0; this.setLion('rush'); }
        break;
      }
      case 'rush': {
        // Corre al redil, entra por la abertura y va derecho al cordero.
        const lamb = this.lamb!, wps: Point[] = [GATE, GATE_IN, lamb.g.position];
        const wp = wps[this.lionWp], last = this.lionWp === 2;
        const d = this.moveLion(wp.x, wp.z, this.lionWp === 0 ? 8.5 : 5, dt);
        speed = 1;
        if (!last && d < 0.8) this.lionWp++;
        if (last && d < 1.4) {
          const lp = L.g.position;
          lamb.state = 'carried';
          L.mouth.add(lamb.g);
          lamb.g.position.set(0, -0.3, 0.05);
          lamb.g.rotation.set(0, Math.PI / 2, 0);
          L.carry = true;
          this.ctx.slow(0.9);
          this.fx.dust(lp.x, lp.y + 0.4, lp.z, 10, 0.8);
          this.setLion('grab');
        }
        break;
      }
      case 'grab': {
        // Se da vuelta con el cordero en la boca.
        const p = L.g.position;
        L.g.rotation.y = lerpAngle(L.g.rotation.y, Math.atan2(GATE_IN.x - p.x, GATE_IN.z - p.z), 1 - Math.exp(-dt * 6));
        speed = 0.15;
        if (this.lionT > 0.7) { this.lionWp = 0; this.setLion('exit'); }
        break;
      }
      case 'exit': {
        const wps: Point[] = [GATE_IN, GATE, EXIT];
        const d = this.moveLion(wps[this.lionWp].x, wps[this.lionWp].z, 5.5, dt);
        speed = 0.85;
        if (d < 0.6 && this.lionWp < 2) this.lionWp++;
        else if (d < 0.3) {
          this.setLion('wait');
          this.ctx.dialog.say(D.leon, () => {
            // David se vuelve hacia el león y empieza la persecución.
            const p = L.g.position;
            pl.yaw = Math.atan2(p.x - pl.x, p.z - pl.z);
            this.ctx.snapCamera();
            this.lionWp = 0;
            this.setLion('flee');
            this.stage = 'perseguir';
            this.updateQuest();
            this.ctx.hud.toast(AVISOS.escapa, 3);
          });
        }
        break;
      }
      case 'wait':
        this.faceDavid(dt, 3);
        break;
      case 'flee': {
        // Corre con el cordero; si David se queda atrás, afloja para que lo pueda alcanzar.
        const d = this.lionDist(), wp = ROUTE[this.lionWp % ROUTE.length];
        const v = d > 16 ? 3.4 : d > 8 ? 4.8 : 5.6;
        if (this.moveLion(wp.x, wp.z, v, dt) < 1.5) this.lionWp++;
        speed = v / 6.5;
        break;
      }
      case 'circle': {
        // Da vueltas alrededor de David, mirándolo.
        const p = L.g.position, a = Math.atan2(p.x - pl.x, p.z - pl.z) + dt * 0.5;
        this.moveLion(pl.x + Math.sin(a) * 6.5, pl.z + Math.cos(a) * 6.5, 4.5, dt);
        this.faceDavid(dt);
        speed = 0.35;
        if (this.lionT > this.circleFor) this.setLion('crouch');
        break;
      }
      case 'crouch': {
        this.faceDavid(dt, 8);
        L.crouch = Math.min(1, L.crouch + dt * 3);
        if (!this.told.golpea) { this.told.golpea = true; this.ctx.hud.toast(AVISOS.golpea, 3.2); }
        if (this.lionT > CROUCH_TIME) {
          const p = L.g.position;
          this.pounceDir.set(pl.x - p.x, 0, pl.z - p.z).normalize();
          this.pounceTotal = this.pounceLeft = Math.hypot(pl.x - p.x, pl.z - p.z) + 1.5;
          this.setLion('pounce');
        }
        break;
      }
      case 'pounce': {
        L.crouch = Math.max(0, L.crouch - dt * 6);
        L.leap = Math.min(1, L.leap + dt * 8);
        const p = L.g.position, v = 11 * dt;
        p.x += this.pounceDir.x * v;
        p.z += this.pounceDir.z * v;
        this.pounceLeft -= v;
        const k = Math.min(1, Math.max(0, 1 - this.pounceLeft / this.pounceTotal));
        p.y = H(p.x, p.z) + Math.sin(k * Math.PI) * 0.9;
        if (this.lionDist() < 1.1) {
          // Derriba a David hacia atrás.
          const back = Math.atan2(pl.x - p.x, pl.z - p.z);
          const [nx, nz] = this.world.clamp(pl.x + Math.sin(back) * 2.5, pl.z + Math.cos(back) * 2.5);
          pl.teleport(nx, nz);
          this.ctx.shake(0.4);
          this.fx.dust(pl.x, H(pl.x, pl.z) + 0.3, pl.z, 12, 1);
          this.ctx.hud.toast(AVISOS.derribo, 2.8, true);
          this.setLion('recover');
        } else if (this.pounceLeft <= 0) this.setLion('recover');
        break;
      }
      case 'hurt': {
        // El golpe lo hace retroceder.
        const p = L.g.position, k = Math.max(0, 1 - this.lionT / 0.5);
        [p.x, p.z] = this.world.clamp(p.x + this.knock.x * k * dt * 7, p.z + this.knock.z * k * dt * 7);
        p.y = H(p.x, p.z);
        this.faceDavid(dt, 3);
        if (this.lionT > 0.8) this.setLion('recover');
        break;
      }
      case 'recover': {
        const p = L.g.position, away = Math.atan2(p.x - pl.x, p.z - pl.z);
        this.moveLion(pl.x + Math.sin(away) * 7, pl.z + Math.cos(away) * 7, 4, dt);
        speed = 0.45;
        if (this.lionT > 1.1) this.setLion('circle');
        break;
      }
      case 'down':
        L.down = Math.min(1, L.down + dt * 1.4);
        break;
    }
    animateLion(L, speed, dt, this.ctx.T);
  }

  private updateRing(): void {
    const show = this.stage === 'pelea' && (this.lionMode === 'crouch' || this.lionMode === 'pounce');
    this.ring.visible = show;
    if (!show) return;
    const p = this.lion.g.position;
    const k = this.lionMode === 'pounce' ? 1 : Math.min(1, this.lionT / CROUCH_TIME);
    const s = 2.7 - k * 1.3;
    this.ring.scale.set(s, s, s);
    this.ring.position.set(p.x, H(p.x, p.z) + 0.06, p.z);
    this.ring.material.color.set(this.inWindow() ? '#ff5a3a' : '#ffd27a');
  }

  private setLion(m: LionMode): void {
    this.lionMode = m;
    this.lionT = 0;
    if (m === 'circle') this.circleFor = 1.6 + rand() * 1.4;
  }

  /** Golpe con el cayado. */
  private strike(): void {
    if (this.swing > 0) return;
    this.swing = SWING_TIME;
    const L = this.lion, p = L.g.position, pl = this.ctx.player, d = this.lionDist();
    if (this.stage === 'perseguir' && this.lionMode === 'flee' && d < 2.8) {
      // Le saca el cordero de la boca (1 S 17:35).
      const lamb = this.lamb!;
      this.world.scene.attach(lamb.g);
      L.carry = false;
      L.hurt = 1;
      lamb.g.position.set(p.x - Math.sin(L.g.rotation.y) * 1.5, 0, p.z - Math.cos(L.g.rotation.y) * 1.5);
      lamb.g.position.y = H(lamb.g.position.x, lamb.g.position.z);
      lamb.g.rotation.set(0, 0, 0);
      lamb.state = 'loose';
      lamb.home = { x: lamb.g.position.x, z: lamb.g.position.z };
      lamb.tx = lamb.home.x; lamb.tz = lamb.home.z;
      lamb.roam = 0.6;
      this.fx.dust(p.x, p.y + 0.6, p.z, 10, 0.8);
      this.ctx.shake(0.25);
      this.stage = 'pelea';
      this.hits = 0;
      this.knock.set(p.x - pl.x, 0, p.z - pl.z).normalize();
      this.setLion('hurt');
      this.updateQuest();
      this.ctx.dialog.say(D.suelta);
      return;
    }
    if (this.stage !== 'pelea' || this.lionMode === 'down') return;
    if (this.inWindow() && d < HIT_R) {
      this.hits++;
      this.ctx.shake(0.35);
      this.fx.dust(p.x, p.y + 0.8, p.z, 14, 0.9);
      L.hurt = 1;
      L.crouch = 0;
      p.y = H(p.x, p.z);
      this.knock.set(p.x - pl.x, 0, p.z - pl.z).normalize();
      this.updateQuest();
      if (this.hits >= 3) {
        this.setLion('down');
        this.stage = 'volver';
        this.ctx.slow(0.8);
        this.ctx.dialog.say(D.vencido, () => this.updateQuest());
        return;
      }
      this.ctx.hud.toast(AVISOS.golpe(this.hits), 1.8, true);
      this.setLion('hurt');
    } else if (this.lionMode === 'circle' && !this.told.espera) {
      this.told.espera = true;
      this.ctx.hud.toast(AVISOS.espera, 2.6);
    }
  }

  private finish(): void {
    this.stage = 'fin';
    this.updateQuest();
    this.ctx.dialog.say(D.fin, () => { this.endT = 0; });
  }

  debug() {
    return {
      stage: this.stage, lion: this.lionMode, hits: this.hits, penned: this.penned(), window: this.inWindow(),
      flock: this.flock.map((s) => ({ x: s.g.position.x, z: s.g.position.z, state: s.state, lamb: s.lamb })),
      lionPos: { x: this.lion.g.position.x, z: this.lion.g.position.z },
      /** Mete todas las ovejas al redil (para probar el león). */
      penAll: () => { for (const s of this.flock) { s.g.position.set(REDIL.x, H(REDIL.x, REDIL.z), REDIL.z); this.pen(s); s.g.position.set(s.home.x, H(s.home.x, s.home.z), s.home.z); } },
      strike: () => this.strike(),
    };
  }
}
