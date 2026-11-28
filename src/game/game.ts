import * as THREE from 'three';
import { H, setGround, disposeScene, type Collider } from '../world/ground';
import { createPerson, animatePerson, removePerson, type Person, type Look } from '../actors/person';
import { FINAL } from '../content/comun';
import { clamp, lerpAngle } from '../util/math';
import { Hud } from './hud';
import { Dialog } from './dialog';
import { Input } from './input';
import { NIVELES } from '../levels';
import type { Level, LevelCtx, LevelDef, PlayerApi, Target } from '../levels/types';

type Mode = 'title' | 'card' | 'play' | 'end';

/** Inclinación de la cámara: positiva mira desde arriba, negativa mira hacia las colinas. */
const CAM_PITCH0 = 0.42, CAM_PITCH_MIN = -0.3, CAM_PITCH_MAX = 1.05, CAM_DIST = 10.3;
/** Después de mover la cámara a mano, espera esto antes de volver a seguir a David. */
const MANUAL_HOLD = 1.2;
const WALK_SPEED = 6.4;
const SAVE_KEY = 'honda.nivel';

/** Nivel más alto desbloqueado (se guarda en el navegador). */
export function savedLevel(): number {
  try { return clamp(Number(localStorage.getItem(SAVE_KEY)) || 1, 1, NIVELES.length); } catch { return 1; }
}
function saveLevel(n: number): void {
  try { if (n > savedLevel()) localStorage.setItem(SAVE_KEY, String(n)); } catch { /* sin almacenamiento */ }
}

/**
 * El juego: maneja el jugador, la cámara, la interfaz y el paso de un nivel al siguiente.
 * Lo propio de cada nivel (mapa, personajes, misiones) vive en src/levels/.
 */
export class Game {
  mode: Mode = 'title';
  scene = new THREE.Scene();
  private def!: LevelDef;
  private level!: Level;
  private ctx: LevelCtx;
  private pl!: { p: Person; x: number; z: number; yaw: number; speed: number; moving: number; look: Look };

  private camYaw = 0;
  private camPitch = CAM_PITCH0;
  private dragYaw = 0;
  private dragPitch = 0;
  private camDragging = false;
  private levelDrag = false;
  private manualHold = 0;
  private near: Target | null = null;
  private slowT = 0;
  private shakeT = 0;
  private T = 0;

  private hud = new Hud();
  private dialog = new Dialog();
  private input: Input;
  private camPos = new THREE.Vector3();
  private look = new THREE.Vector3();
  private tmp = new THREE.Vector3();

  constructor(private camera: THREE.PerspectiveCamera, private stage: HTMLElement, lowEnd: boolean) {
    this.input = new Input(stage, document.getElementById('joy')!, document.getElementById('knob')!, document.getElementById('act')!);
    this.input.onAction = () => this.action();
    this.input.onTap = () => { if (this.dialog.open) this.dialog.advance(); };
    this.input.drag = {
      start: () => {
        if (this.mode !== 'play' || this.dialog.open) return;
        this.levelDrag = this.level.drag?.start() ?? false;
        if (this.levelDrag) return;
        this.dragYaw = this.camYaw;
        this.dragPitch = this.camPitch;
        this.camDragging = true;
      },
      move: (dx, dy) => {
        if (this.dialog.open) return;
        if (this.levelDrag) return this.level.drag?.move(dx, dy);
        if (!this.camDragging) return;
        // Arrastrar hacia arriba mira hacia arriba (las colinas); hacia abajo, desde más alto.
        this.camYaw = this.dragYaw - dx * 0.006;
        this.camPitch = clamp(this.dragPitch + dy * 0.005, CAM_PITCH_MIN, CAM_PITCH_MAX);
      },
      end: (cancelled) => {
        if (this.camDragging) { this.camDragging = false; this.manualHold = MANUAL_HOLD; }
        if (this.levelDrag) { this.levelDrag = false; if (!this.dialog.open) this.level.drag?.end(cancelled); }
      },
    };
    (document.getElementById('endQuote') as HTMLElement).textContent = FINAL.cita;
    (document.getElementById('endNote') as HTMLElement).textContent = FINAL.nota;

    const game = this;
    const player: PlayerApi = {
      get x() { return game.pl.x; }, set x(v) { game.pl.x = v; },
      get z() { return game.pl.z; }, set z(v) { game.pl.z = v; },
      get yaw() { return game.pl.yaw; }, set yaw(v) { game.pl.yaw = v; },
      get person() { return game.pl.p; },
      get speed() { return game.pl.speed; }, set speed(v) { game.pl.speed = v; },
      get moving() { return game.pl.moving; },
      setLook: (look) => {
        const sling = this.pl.p.sling;
        removePerson(this.scene, this.pl.p);
        this.pl.p = createPerson(this.scene, look, this.pl.x, this.pl.z, this.pl.yaw);
        this.pl.p.sling = sling;
        this.pl.look = look;
      },
      teleport: (x, z, yaw) => { this.pl.x = x; this.pl.z = z; if (yaw !== undefined) this.pl.yaw = yaw; },
    };
    this.ctx = {
      hud: this.hud, dialog: this.dialog, player, camera, lowEnd,
      get T() { return game.T; },
      quest: (text, progress) => this.hud.setQuest(text, progress ?? null),
      complete: () => this.complete(),
      slow: (s) => { this.slowT = s; },
      shake: (s) => { this.shakeT = s; },
      fade: (mid) => this.hud.fade(mid),
      snapCamera: () => this.snapCamera(),
    };
  }

  get timeScale(): number { return this.slowT > 0 ? 0.28 : 1; }
  get levelNumber(): number { return this.def?.n ?? 0; }

  // ---------- Niveles ----------

  /** Construye el nivel n (sin empezarlo). En la pantalla de título se ve de fondo. */
  load(n: number): void {
    if (this.level) disposeScene(this.scene);
    this.def = NIVELES[n - 1];
    this.dialog.close();
    this.hud.hideAll();
    this.level = this.def.create(this.ctx);
    this.scene = this.level.world.scene;
    setGround(this.level.world.height);
    const s = this.level.start;
    this.pl = { p: createPerson(this.scene, this.level.look, s.x, s.z, s.yaw), x: s.x, z: s.z, yaw: s.yaw, speed: 1, moving: 0, look: this.level.look };
    this.T = 0;
    this.slowT = this.shakeT = 0;
    this.snapCamera();
  }

  /** Muestra la tarjeta del nivel; al tocar "Empezar" arranca. */
  showCard(n: number): void {
    if (this.def?.n !== n) this.load(n);
    this.mode = 'card';
    this.input.active = false;
    this.hud.hideAll();
    this.hud.card(this.def, NIVELES.length, () => {
      this.mode = 'play';
      this.input.active = true;
      this.hud.showQuest(true);
      this.snapCamera();
      this.level.begin();
    });
  }

  private complete(): void {
    const n = this.def.n;
    saveLevel(n + 1);
    if (n >= NIVELES.length) {
      this.mode = 'end';
      this.input.active = false;
      this.hud.hideAll();
      const end = document.getElementById('end')!;
      end.hidden = false;
      (end.querySelector('button') as HTMLButtonElement).focus({ preventScroll: true });
      return;
    }
    this.hud.fade(() => this.showCard(n + 1));
  }

  restart(): void {
    document.getElementById('end')!.hidden = true;
    this.showCard(1);
  }

  // ---------- Ciclo ----------

  /** dt: tiempo de juego (puede ir en cámara lenta). rdt: tiempo real. */
  update(dt: number, rdt: number): void {
    if (!this.level) return;
    if (this.slowT > 0) this.slowT -= rdt;
    if (this.manualHold > 0) this.manualHold -= rdt;
    this.T += dt;
    if (this.mode === 'play') {
      this.updatePlayer(dt, rdt);
      this.level.update(dt, rdt);
    } else {
      animatePerson(this.pl.p, 0, dt, this.T);
    }
    this.level.world.update(this.T);
    this.dialog.update(rdt);
    this.hud.update(rdt);
    this.updateUi();
    this.updateCamera(rdt);
  }

  private colliders(): Collider[] {
    const extra = this.level.colliders?.();
    return extra ? this.level.world.colliders.concat(extra) : this.level.world.colliders;
  }

  private resolve(x: number, z: number, r: number): [number, number] {
    const all = this.colliders();
    for (let it = 0; it < 2; it++) {
      for (const c of all) {
        const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
        if (d < m && d > 1e-4) { x = c.x + (dx / d) * m; z = c.z + (dz / d) * m; }
      }
    }
    return this.level.world.clamp(x, z);
  }

  private updatePlayer(dt: number, rdt: number): void {
    const pl = this.pl;
    let { x: ix, y: iy } = this.input.axis();
    const free = !this.dialog.open && (this.level.canMove?.() ?? true);
    if (!free) ix = iy = 0;
    const mag = Math.min(1, Math.hypot(ix, iy));
    pl.moving = 0;
    if (mag > 0.08) {
      // Relativo a la cámara: "arriba" en el joystick es alejarse de la cámara.
      const fx = -Math.sin(this.camYaw), fz = -Math.cos(this.camYaw), rx = Math.cos(this.camYaw), rz = -Math.sin(this.camYaw);
      let mx = fx * -iy + rx * ix, mz = fz * -iy + rz * ix;
      const l = Math.hypot(mx, mz);
      mx /= l; mz /= l;
      const v = WALK_SPEED * mag * pl.speed * (this.level.world.speedAt?.(pl.x, pl.z) ?? 1);
      [pl.x, pl.z] = this.resolve(pl.x + mx * v * dt, pl.z + mz * v * dt, 0.45);
      pl.yaw = lerpAngle(pl.yaw, Math.atan2(mx, mz), 1 - Math.exp(-dt * 12));
      pl.moving = mag * Math.min(1, pl.speed * 1.5);
      this.followCamera(-iy / mag, mag, rdt);
    }
    pl.p.g.position.set(pl.x, H(pl.x, pl.z), pl.z);
    pl.p.g.rotation.y = pl.yaw;
    animatePerson(pl.p, pl.moving, dt, this.T);
  }

  /**
   * Al caminar, la cámara vuelve sola detrás de David y gira con él. No sigue si el jugador está
   * moviendo la cámara (ni un momento después) ni cuando camina hacia la cámara, para no dar vueltas.
   */
  private followCamera(forward: number, mag: number, rdt: number): void {
    if (this.camDragging || this.manualHold > 0 || forward < -0.35) return;
    const k = 1 - Math.exp(-rdt * 2.4 * mag);
    this.camYaw = lerpAngle(this.camYaw, this.pl.yaw + Math.PI, k);
    this.camPitch += (CAM_PITCH0 - this.camPitch) * (1 - Math.exp(-rdt * 1.2 * mag));
  }

  private snapCamera(): void {
    this.camYaw = this.pl.yaw + Math.PI - 0.35;
    this.camPitch = CAM_PITCH0;
    this.exploreShot();
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.look);
  }

  private action(): void {
    if (this.mode !== 'play') return;
    if (this.dialog.open) return this.dialog.advance();
    const own = this.level.action?.();
    if (own) return own.run();
    if (this.near) this.level.interact(this.near.id);
  }

  // ---------- Interfaz y cámara ----------

  private findNear(): Target | null {
    let best: Target | null = null, bd = Infinity;
    for (const t of this.level.targets()) {
      const d = Math.hypot(t.x - this.pl.x, t.z - this.pl.z);
      if (d < (t.r ?? 3.2) && d < bd) { bd = d; best = t; }
    }
    return best;
  }

  private updateUi(): void {
    if (this.mode !== 'play') { this.hud.action(null); this.hud.joystick(false); this.hud.hidePrompt(); return; }
    const open = this.dialog.open;
    const own = open ? null : this.level.action?.() ?? null;
    this.near = !open && !own ? this.findNear() : null;
    this.hud.action(open ? 'Seguir' : own ? own.label : this.near ? this.near.verb : null);
    this.hud.joystick(!open && (this.level.canMove?.() ?? true));

    const n = this.near;
    if (!n) { this.hud.hidePrompt(); return; }
    const v = this.tmp.set(n.x, H(n.x, n.z) + (n.y ?? 2.85), n.z).project(this.camera);
    if (v.z > 1) { this.hud.hidePrompt(); return; }
    this.hud.prompt(((v.x + 1) / 2) * this.stage.clientWidth, ((1 - v.y) / 2) * this.stage.clientHeight, n.name, n.verb);
  }

  private exploreShot(): void {
    const ty = H(this.pl.x, this.pl.z) + 1.6, p = this.camPitch, h = Math.cos(p) * CAM_DIST;
    this.camPos.set(this.pl.x + Math.sin(this.camYaw) * h, ty + Math.sin(p) * CAM_DIST + 0.4, this.pl.z + Math.cos(this.camYaw) * h);
    // Al bajar la cámara, la mirada sube: así se ven las laderas y los montes.
    this.look.set(this.pl.x, ty + Math.max(0, CAM_PITCH0 - p) * 3.5, this.pl.z);
  }

  private updateCamera(rdt: number): void {
    if (this.mode === 'title') {
      // Vuelta lenta alrededor de David.
      const a = this.T * 0.08 + 2.2, ty = H(this.pl.x, this.pl.z);
      this.camPos.set(this.pl.x + Math.sin(a) * 22, ty + 9, this.pl.z + Math.cos(a) * 22);
      this.camera.position.lerp(this.camPos, 1 - Math.exp(-rdt * 2));
      this.camera.lookAt(this.pl.x, ty + 2, this.pl.z);
      this.level.world.sun.place(this.pl.x, this.pl.z);
      return;
    }
    const shot = this.mode === 'play' ? this.level.camera?.() : null;
    let rate = 6;
    if (shot) {
      this.camPos.copy(shot.pos);
      this.look.copy(shot.look);
      rate = shot.rate ?? 3;
    } else {
      this.exploreShot();
    }
    const ground = H(this.camPos.x, this.camPos.z) + 1.4;
    if (this.camPos.y < ground) this.camPos.y = ground;
    this.camera.position.lerp(this.camPos, 1 - Math.exp(-rdt * rate));
    if (this.shakeT > 0) {
      this.shakeT -= rdt;
      this.camera.position.x += (Math.random() - 0.5) * this.shakeT * 0.5;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeT * 0.5;
    }
    this.camera.lookAt(this.look);
    this.level.world.sun.place(this.pl.x, this.pl.z);
  }

  // ---------- Pruebas ----------

  /** Atajos para pruebas automáticas (solo con ?debug en la URL). */
  debugApi() {
    const self = this; // eslint-disable-line @typescript-eslint/no-this-alias
    return {
      get mode() { return self.mode; },
      get level() { return self.levelNumber; },
      get dialogOpen() { return self.dialog.open; },
      get player() { return { x: self.pl.x, z: self.pl.z }; },
      get targets() { return self.level.targets().map((t) => ({ id: t.id, x: t.x, z: t.z })); },
      get actionLabel() { return self.level.action?.()?.label ?? null; },
      get info() { return self.level.debug?.() ?? {}; },
      action: () => self.action(),
      interact: (id: string) => self.level.interact(id),
      teleport: (x: number, z: number) => { self.pl.x = x; self.pl.z = z; },
      /** Carga el nivel n y lo empieza sin la tarjeta. */
      play: (n: number) => {
        document.getElementById('title')!.hidden = true;
        document.getElementById('end')!.hidden = true;
        self.load(n);
        self.hud.closeCard();
        self.mode = 'play';
        self.input.active = true;
        self.hud.showQuest(true);
        self.level.begin();
      },
      skipDialog: () => { for (let i = 0; i < 40 && self.dialog.open; i++) self.dialog.advance(), self.dialog.advance(); },
      level$: () => self.level,
      /** Avanza el juego s segundos en pasos de 1/30 (sirve con la pestaña oculta). */
      step: (s: number) => { for (let i = 0; i < s * 30; i++) self.update((1 / 30) * self.timeScale, 1 / 30); },
    };
  }
}
