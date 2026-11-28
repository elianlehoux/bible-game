import * as THREE from 'three';
import { H, inWater, mx, eastOfBed, BED_HALF } from '../world/terrain';
import { START, START_YAW, GOLIAT_POS, ESCUDERO_OFFSET, ENGAGE_R, AIM_DIST, STONE_SPOTS, SHEEP_SPOTS, BOUNDS, type Collider, type Point } from '../world/layout';
import type { Props } from '../world/props';
import type { Water } from '../world/terrain';
import type { SunRig } from '../world/sky';
import { createPerson, animatePerson, removePerson, type Person } from '../actors/person';
import { createSheep, updateSheep, type Sheep } from '../actors/sheep';
import { ELENCO, DAVID, GOLIAT, ESCUDERO, DIALOGOS, MISIONES, ZONAS, AVISOS, FINAL, type NpcId } from '../content/episodio1';
import { clamp, lerpAngle, smooth } from '../util/math';
import { softDot } from '../util/materials';
import { Hud } from './hud';
import { Dialog } from './dialog';
import { Input } from './input';
import { Fx } from './fx';
import { Sling, type MissReason } from './sling';

type Mode = 'title' | 'explore' | 'approach' | 'aim' | 'cutscene' | 'end';
type Zone = keyof typeof ZONAS;

interface State { food: boolean; saul: boolean; stones: number; won: boolean; ammo: number }
interface Npc { id: NpcId; name: string; x: number; z: number; yaw0: number; p: Person; flee: boolean; side: 'israel' | 'filisteo' }
interface Target { id: NpcId | 'goliat' | 'piedra'; name: string; x: number; z: number; big: boolean; stone?: StoneObj }
interface StoneObj { grp: THREE.Group; st: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>; glow: THREE.Sprite; x: number; z: number }

const GOLIAT_SCALE = GOLIAT.scale ?? 1;
/** La cámara empieza detrás de David, que llega mirando hacia el campamento. */
const CAM_YAW0 = START_YAW + Math.PI - 0.35;
const PICK_R = 1.7;
/** Inclinación de la cámara: positiva mira desde arriba, negativa mira hacia las colinas. */
const CAM_PITCH0 = 0.42, CAM_PITCH_MIN = -0.3, CAM_PITCH_MAX = 1.05, CAM_DIST = 10.3;
/** Después de mover la cámara a mano, espera esto antes de volver a seguir a David. */
const MANUAL_HOLD = 1.2;
const freshState = (): State => ({ food: false, saul: false, stones: 0, won: false, ammo: 5 });

export interface World { props: Props; water: Water; sun: SunRig }

export class Game {
  mode: Mode = 'title';
  private S: State = freshState();
  private player!: { p: Person; x: number; z: number; yaw: number };
  private npcs: Npc[] = [];
  private goliat!: Person;
  /** Goliat avanza hacia David antes del duelo (1 S 17:41, 48), así que su posición cambia. */
  private gpos: Point = { ...GOLIAT_POS };
  private gyaw = -Math.PI / 2;
  private escudero!: { p: Person; x: number; z: number; flee: boolean };
  private flock: Sheep[] = [];
  private stones: StoneObj[];
  private camYaw = CAM_YAW0;
  private camPitch = CAM_PITCH0;
  private dragYaw = 0;
  private dragPitch = 0;
  private camDragging = false;
  private manualHold = 0;
  private near: Target | null = null;
  private zone: Zone | '' = '';
  private slow = 0;
  private shake = 0;
  private cut: { t: number; landed: boolean; spoke: boolean } | null = null;
  private T = 0;

  private hud = new Hud();
  private dialog = new Dialog();
  private input: Input;
  private fx: Fx;
  private sling: Sling;

  private camPos = new THREE.Vector3();
  private look = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private head = new THREE.Vector3();
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private stage: HTMLElement;
  private world: World;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, stage: HTMLElement, world: World) {
    this.scene = scene;
    this.camera = camera;
    this.stage = stage;
    this.world = world;
    this.fx = new Fx(scene);
    this.sling = new Sling(scene);
    this.stones = this.createStones();
    this.input = new Input(stage, document.getElementById('joy')!, document.getElementById('knob')!, document.getElementById('act')!);
    this.input.onAction = () => this.action();
    this.input.onTap = () => { if (this.dialog.open) this.dialog.advance(); };
    this.input.drag = {
      start: () => {
        this.dragYaw = this.camYaw;
        this.dragPitch = this.camPitch;
        if (this.mode === 'explore') this.camDragging = true;
        if (this.mode === 'aim' && !this.dialog.open) this.sling.beginDrag();
      },
      move: (dx, dy) => {
        if (this.dialog.open) return;
        if (this.mode === 'aim') this.sling.dragTo(dx, dy);
        else if (this.mode === 'explore') {
          // Arrastrar hacia arriba mira hacia arriba (las colinas); hacia abajo, desde más alto.
          this.camYaw = this.dragYaw - dx * 0.006;
          this.camPitch = clamp(this.dragPitch + dy * 0.005, CAM_PITCH_MIN, CAM_PITCH_MAX);
        }
      },
      end: (cancelled) => {
        if (this.camDragging) { this.camDragging = false; this.manualHold = MANUAL_HOLD; }
        if (this.mode === 'aim' && !this.dialog.open && !cancelled) this.throwStone();
      },
    };
    (document.getElementById('endQuote') as HTMLElement).textContent = FINAL.cita;
    (document.getElementById('endNote') as HTMLElement).textContent = FINAL.nota;
    this.spawn();
    this.titleCamera(0, true);
  }

  // ---------- Ciclo de vida ----------

  start(): void {
    if (this.mode !== 'title') return;
    this.mode = 'explore';
    this.input.active = true;
    this.zone = 'israel';
    this.hud.showQuest(true);
    this.updateQuest();
    this.camera.position.set(this.player.x + Math.sin(this.camYaw) * 16, 14, this.player.z + Math.cos(this.camYaw) * 16);
    this.dialog.say(DIALOGOS.intro);
  }

  restart(): void {
    this.spawn();
    this.mode = 'explore';
    this.camYaw = CAM_YAW0;
    this.camPitch = CAM_PITCH0;
    this.zone = 'israel';
    this.cut = null;
    this.slow = 0;
    this.sling.hide();
    document.getElementById('end')!.hidden = true;
    this.hud.showQuest(true);
    this.hud.aim(null);
    this.updateQuest();
    this.dialog.say(DIALOGOS.intro);
  }

  /** dt: tiempo de juego (puede ir en cámara lenta). rdt: tiempo real. */
  update(dt: number, rdt: number): void {
    if (this.slow > 0) this.slow -= rdt;
    if (this.manualHold > 0) this.manualHold -= rdt;
    this.T += dt;
    this.updatePlayer(dt, rdt);
    this.checkEngage();
    this.updateStones(dt);
    this.updateNpcs(dt);
    this.updateAim(dt);
    if (this.mode === 'approach') this.updateApproach(dt);
    if (this.mode === 'cutscene') this.updateCutscene(dt);
    this.world.props.update(this.T);
    this.world.water.update(this.T);
    this.fx.update(dt);
    this.dialog.update(rdt);
    this.hud.update(rdt);
    this.updateUi();
    this.updateCamera(rdt);
  }

  get timeScale(): number { return this.slow > 0 ? 0.28 : 1; }

  // ---------- Construcción ----------

  private spawn(): void {
    if (this.player) {
      removePerson(this.scene, this.player.p);
      for (const n of this.npcs) removePerson(this.scene, n.p);
      removePerson(this.scene, this.goliat);
      removePerson(this.scene, this.escudero.p);
      for (const s of this.flock) this.scene.remove(s.g);
    }
    this.S = freshState();
    this.player = { p: createPerson(this.scene, DAVID, START.x, START.z, START_YAW), x: START.x, z: START.z, yaw: START_YAW };
    this.npcs = ELENCO.map((c) => ({ id: c.id, name: c.name, x: c.x, z: c.z, yaw0: c.yaw, side: c.side, flee: false, p: createPerson(this.scene, c.look, c.x, c.z, c.yaw) }));
    this.gpos = { ...GOLIAT_POS };
    this.gyaw = -Math.PI / 2;
    this.goliat = createPerson(this.scene, GOLIAT, this.gpos.x, this.gpos.z, this.gyaw);
    const ex = GOLIAT_POS.x + ESCUDERO_OFFSET.x, ez = GOLIAT_POS.z + ESCUDERO_OFFSET.z;
    this.escudero = { p: createPerson(this.scene, ESCUDERO, ex, ez, -1.7), x: ex, z: ez, flee: false };
    this.flock = SHEEP_SPOTS.map((s) => createSheep(this.scene, s.x, s.z));
    for (const s of this.stones) s.grp.visible = false;
  }

  private createStones(): StoneObj[] {
    const glowTex = softDot(64, 'rgba(255,236,170,1)', 'rgba(255,214,120,.55)');
    return STONE_SPOTS.map((s) => {
      const grp = new THREE.Group();
      grp.position.set(s.x, H(s.x, s.z) + 0.12, s.z);
      // Lisa y redondeada (más subdivisión que los cantos comunes) para que se distinga al acercarse.
      const st = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), new THREE.MeshStandardMaterial({ color: '#efe9db', emissive: '#ffcf6a', emissiveIntensity: 0.2, flatShading: true, roughness: 0.35 }));
      st.scale.set(1.1, 0.65, 0.85);
      st.castShadow = true;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      glow.scale.set(1.8, 1.8, 1);
      glow.position.y = 0.2;
      grp.add(st, glow);
      grp.visible = false;
      this.scene.add(grp);
      return { grp, st, glow, x: s.x, z: s.z };
    });
  }

  // ---------- Historia ----------

  private talk(t: Target): void {
    const S = this.S, say = (l: Parameters<Dialog['say']>[0], f?: () => void) => this.dialog.say(l, f);
    switch (t.id) {
      case 'eliab':
        if (!S.food) return say(DIALOGOS.eliab, () => { S.food = true; this.hud.toast(AVISOS.comidaEntregada); this.updateQuest(); });
        return say(DIALOGOS.eliabDespues);
      case 'saul':
        if (!S.food) return say(DIALOGOS.saulAntes);
        if (!S.saul) return say(DIALOGOS.saul, () => {
          S.saul = true;
          for (const s of this.stones) s.grp.visible = true;
          this.hud.toast(AVISOS.buscarPiedras, 3.2);
          this.updateQuest();
        });
        return say(DIALOGOS.saulDespues);
      case 'sold1':
        return say(S.won ? DIALOGOS.soldado1Final : DIALOGOS.soldado1);
      case 'sold2':
        return say(DIALOGOS.soldado2);
      case 'fil1': case 'fil2': case 'fil3':
        return say(DIALOGOS.filisteo);
      case 'goliat':
        if (S.stones < 5) return say(DIALOGOS.goliatAntes);
        return this.confront();
      case 'piedra':
        if (t.stone) this.pickStone(t.stone);
    }
  }

  private updateQuest(): void {
    const S = this.S;
    const text = !S.food ? MISIONES.comida : !S.saul ? MISIONES.saul : S.stones < 5 ? MISIONES.piedras : !S.won ? MISIONES.gigante : MISIONES.fin;
    const bar = S.saul && !S.won ? (this.mode === 'aim' ? S.ammo : S.stones) : null;
    this.hud.setQuest(text, bar);
  }

  private action(): void {
    if (this.mode === 'title' || this.mode === 'end') return;
    if (this.dialog.open) return this.dialog.advance();
    if (this.mode === 'aim') return this.throwStone();
    if (this.mode === 'explore' && this.near) this.talk(this.near);
  }

  // ---------- Jugador y mundo ----------

  private colliders(): Collider[] {
    const dyn: Collider[] = this.npcs.filter((n) => !n.flee).map((n) => ({ x: n.x, z: n.z, r: 0.7 }));
    dyn.push({ x: this.gpos.x, z: this.gpos.z, r: 1.4 });
    if (!this.escudero.flee) dyn.push({ x: this.escudero.x, z: this.escudero.z, r: 0.9 });
    for (const s of this.flock) dyn.push({ x: s.g.position.x, z: s.g.position.z, r: 0.6 });
    return this.world.props.colliders.concat(dyn);
  }

  private resolve(x: number, z: number, r: number): [number, number] {
    const all = this.colliders();
    for (let it = 0; it < 2; it++) {
      for (const c of all) {
        const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
        if (d < m && d > 1e-4) { x = c.x + (dx / d) * m; z = c.z + (dz / d) * m; }
      }
    }
    const e = Math.hypot(x / BOUNDS.rx, z / BOUNDS.rz);
    return e > 1 ? [x / e, z / e] : [x, z];
  }

  private updatePlayer(dt: number, rdt: number): void {
    const pl = this.player;
    let { x: ix, y: iy } = this.input.axis();
    if (this.mode === 'aim' && !this.dialog.open && !this.sling.flying) this.sling.nudge(ix, iy, rdt);
    if (this.mode !== 'explore' || this.dialog.open) ix = iy = 0;
    const mag = Math.min(1, Math.hypot(ix, iy));
    let speed = 0;
    if (mag > 0.08) {
      // Relativo a la cámara: "arriba" en el joystick es alejarse de la cámara.
      const fx = -Math.sin(this.camYaw), fz = -Math.cos(this.camYaw), rx = Math.cos(this.camYaw), rz = -Math.sin(this.camYaw);
      let mx = fx * -iy + rx * ix, mz = fz * -iy + rz * ix;
      const l = Math.hypot(mx, mz);
      mx /= l; mz /= l;
      const v = 6.4 * mag * (inWater(pl.x, pl.z) ? 0.55 : 1);
      [pl.x, pl.z] = this.resolve(pl.x + mx * v * dt, pl.z + mz * v * dt, 0.45);
      pl.yaw = lerpAngle(pl.yaw, Math.atan2(mx, mz), 1 - Math.exp(-dt * 12));
      speed = mag;
      this.followCamera(-iy / mag, mag, rdt);
      this.checkZone();
    }
    if (this.mode === 'approach' || this.mode === 'aim' || this.mode === 'cutscene') pl.yaw = lerpAngle(pl.yaw, Math.atan2(this.sling.forward.x, this.sling.forward.z), 1 - Math.exp(-dt * 10));
    pl.p.g.position.set(pl.x, H(pl.x, pl.z), pl.z);
    pl.p.g.rotation.y = pl.yaw;
    animatePerson(pl.p, speed, dt, this.T);
  }

  /**
   * Al caminar, la cámara vuelve sola detrás de David y gira con él. No sigue si el jugador está
   * moviendo la cámara (ni un momento después) ni cuando camina hacia la cámara, para no dar vueltas.
   */
  private followCamera(forward: number, mag: number, rdt: number): void {
    if (this.camDragging || this.manualHold > 0 || forward < -0.35) return;
    const k = 1 - Math.exp(-rdt * 2.4 * mag);
    this.camYaw = lerpAngle(this.camYaw, this.player.yaw + Math.PI, k);
    this.camPitch += (CAM_PITCH0 - this.camPitch) * (1 - Math.exp(-rdt * 1.2 * mag));
  }

  private checkZone(): void {
    const sx = this.player.x - mx(this.player.z), z: Zone = sx < -(BED_HALF + 4) ? 'israel' : sx <= BED_HALF + 4 ? 'arroyo' : 'filisteo';
    if (z === this.zone) return;
    this.zone = z;
    const info: { nombre: string; sub?: string } = ZONAS[z];
    this.hud.area(info.nombre, info.sub);
  }

  private updateStones(dt: number): void {
    this.stones.forEach((s, i) => {
      if (!s.grp.visible) return;
      // Brillan apenas de lejos y más al acercarse: hay que recorrer el lecho para encontrarlas.
      const d = Math.hypot(s.x - this.player.x, s.z - this.player.z), near = 1 - smooth(3, 16, d);
      const pulse = 0.5 + Math.sin(this.T * 4 + i) * 0.5;
      s.st.material.emissiveIntensity = 0.08 + near * (0.15 + pulse * 0.2);
      s.glow.material.opacity = 0.12 + near * (0.3 + pulse * 0.35);
      s.st.rotation.y += dt * 0.6;
    });
  }

  private pickStone(s: StoneObj): void {
    s.grp.visible = false;
    this.S.stones++;
    this.updateQuest();
    this.hud.toast(AVISOS.piedra(this.S.stones));
    if (this.S.stones === 5) setTimeout(() => this.dialog.say(DIALOGOS.piedrasCompletas), 500);
  }

  private updateNpcs(dt: number): void {
    const T = this.T;
    for (const n of this.npcs) {
      if (n.flee) {
        n.x += dt * 8;
        n.p.g.rotation.y = lerpAngle(n.p.g.rotation.y, Math.PI / 2, 0.2);
        n.p.g.position.set(n.x, H(n.x, n.z), n.z);
        animatePerson(n.p, 1, dt, T);
        if (n.x > 60) n.p.g.visible = false;
        continue;
      }
      const d = Math.hypot(this.player.x - n.x, this.player.z - n.z);
      const want = d < 7 && this.mode === 'explore' ? Math.atan2(this.player.x - n.x, this.player.z - n.z) : n.yaw0;
      n.p.g.rotation.y = lerpAngle(n.p.g.rotation.y, want, 1 - Math.exp(-dt * 4));
      animatePerson(n.p, 0, dt, T);
    }
    const e = this.escudero;
    if (e.flee) {
      e.x += dt * 7;
      e.p.g.rotation.y = lerpAngle(e.p.g.rotation.y, Math.PI / 2, 0.2);
    }
    e.p.g.position.set(e.x, H(e.x, e.z), e.z);
    animatePerson(e.p, e.flee || this.mode === 'approach' ? 1 : 0, dt, T);
    this.goliat.g.position.set(this.gpos.x, H(this.gpos.x, this.gpos.z), this.gpos.z);
    this.goliat.g.rotation.y = this.gyaw;
    if (!this.S.won && this.mode !== 'approach') {
      this.goliat.armR.rotation.x = -0.25 + Math.sin(T * 1.3) * 0.12;
      this.goliat.armL.rotation.x = Math.sin(T * 1.3 + 1) * 0.1;
    }
    animatePerson(this.goliat, this.mode === 'approach' ? 0.6 : 0, dt, T);
    for (const s of this.flock) updateSheep(s, dt, T);
  }

  // ---------- Honda ----------

  private headPos(out: THREE.Vector3): THREE.Vector3 {
    return out.set(this.gpos.x, H(this.gpos.x, this.gpos.z) + 2.02 * GOLIAT_SCALE + 0.05, this.gpos.z);
  }

  /** Con las cinco piedras, al cruzar el arroyo y acercarse, Goliat sale a su encuentro. */
  private checkEngage(): void {
    if (this.mode !== 'explore' || this.dialog.open || this.S.stones < 5 || this.S.won) return;
    const pl = this.player;
    if (eastOfBed(pl.x, pl.z) && Math.hypot(this.gpos.x - pl.x, this.gpos.z - pl.z) < ENGAGE_R) this.confront();
  }

  /** El filisteo avanza con su escudero delante (1 S 17:41) y después habla. */
  private confront(): void {
    this.mode = 'approach';
    this.hud.toast(AVISOS.acerca, 2.2);
  }

  private updateApproach(dt: number): void {
    const pl = this.player, g = this.gpos;
    const dx = pl.x - g.x, dz = pl.z - g.z, d = Math.hypot(dx, dz);
    this.gyaw = lerpAngle(this.gyaw, Math.atan2(dx, dz), 1 - Math.exp(-dt * 5));
    this.sling.setBasis(pl.x, pl.z, this.headPos(this.head));
    if (d > AIM_DIST) {
      const step = Math.min(d - AIM_DIST, dt * 1.8);
      g.x += (dx / d) * step;
      g.z += (dz / d) * step;
      // El escudero se mantiene delante, entre Goliat y David.
      const ex = g.x + (dx / d) * 1.8 - (dz / d) * 1.2, ez = g.z + (dz / d) * 1.8 + (dx / d) * 1.2;
      this.escudero.x += (ex - this.escudero.x) * (1 - Math.exp(-dt * 4));
      this.escudero.z += (ez - this.escudero.z) * (1 - Math.exp(-dt * 4));
      this.escudero.p.g.rotation.y = lerpAngle(this.escudero.p.g.rotation.y, Math.atan2(dx, dz), 0.1);
      return;
    }
    if (this.dialog.open) return;
    this.dialog.say(DIALOGOS.goliat, () => this.startAim());
  }

  private startAim(): void {
    // David se queda donde está: ya cruzó el arroyo y tiene al gigante enfrente.
    this.mode = 'aim';
    this.S.ammo = 5;
    this.sling.setBasis(this.player.x, this.player.z, this.headPos(this.head));
    this.sling.reset();
    this.player.p.sling = true;
    this.hud.aim(AVISOS.apuntar);
    this.hud.toast(AVISOS.corre, 2);
    this.updateQuest();
  }

  private throwStone(): void {
    if (this.mode !== 'aim' || this.sling.flying) return;
    if (this.S.ammo <= 0) this.S.ammo = 5;
    this.S.ammo--;
    this.updateQuest();
    this.sling.launch();
    this.hud.aim(null);
  }

  private hitsBody = (p: THREE.Vector3): boolean => {
    const gy = H(this.gpos.x, this.gpos.z), dx = p.x - this.gpos.x, dz = p.z - this.gpos.z;
    return p.y > gy && p.y < gy + 1.8 * GOLIAT_SCALE && dx * dx + dz * dz < 1.05 * 1.05;
  };

  private updateAim(dt: number): void {
    if (this.mode !== 'aim') return;
    this.sling.setBasis(this.player.x, this.player.z, this.headPos(this.head));
    this.player.p.armR.rotation.x = -2.7 + Math.sin(this.T * 13) * 0.25;
    if (!this.sling.flying) { this.sling.showAiming(this.T); return; }
    const r = this.sling.step(dt, this.hitsBody);
    if (!r) return;
    if (r.kind === 'hit') return this.win(r.at);
    this.fx.dust(r.at.x, r.at.y, r.at.z, 10, 0.6);
    const msg: Record<MissReason, string> = { armor: AVISOS.coraza, high: AVISOS.alto, low: AVISOS.bajo, right: AVISOS.derecha, left: AVISOS.izquierda, long: AVISOS.largo };
    this.hud.toast(msg[r.reason] + (this.S.ammo > 0 ? AVISOS.quedan(this.S.ammo) : ''), 2.4);
    setTimeout(() => {
      if (this.mode !== 'aim') return;
      this.hud.aim(AVISOS.apuntar);
      if (this.S.ammo <= 0) { this.S.ammo = 5; this.updateQuest(); this.hud.toast(AVISOS.recarga, 2); }
    }, 600);
  }

  private win(at: THREE.Vector3): void {
    this.S.won = true;
    this.slow = 1.1;
    this.shake = 0.5;
    this.mode = 'cutscene';
    this.cut = { t: 0, landed: false, spoke: false };
    this.sling.hide();
    this.player.p.sling = false;
    this.hud.aim(null);
    this.fx.dust(at.x, at.y, at.z, 16, 0.9);
    this.updateQuest();
  }

  private updateCutscene(dt: number): void {
    const c = this.cut!;
    c.t += dt;
    // Cae hacia adelante, sobre su rostro (1 S 17:49).
    const k = clamp((c.t - 0.35) / 1.25, 0, 1);
    this.goliat.rig.rotation.x = k * k * (Math.PI / 2) * 0.98;
    this.goliat.rig.position.y = Math.sin((k * Math.PI) / 2) * 0.45;
    if (k >= 1 && !c.landed) {
      c.landed = true;
      this.shake = 0.6;
      // Cae hacia adelante, del lado de David.
      const gx = this.gpos.x + Math.sin(this.gyaw) * 3.5, gz = this.gpos.z + Math.cos(this.gyaw) * 3.5;
      this.fx.dust(gx, H(gx, gz) + 0.3, gz, 40, 2.2);
    }
    if (c.t > 2.2 && !c.spoke) {
      c.spoke = true;
      this.dialog.say(DIALOGOS.victoria, () => {
        for (const n of this.npcs) { if (n.side === 'filisteo') n.flee = true; else n.p.armsUp = true; }
        this.escudero.flee = true;
        setTimeout(() => this.showEnd(), 2600);
      });
    }
  }

  private showEnd(): void {
    this.mode = 'end';
    this.hud.hideAll();
    const end = document.getElementById('end')!;
    end.hidden = false;
    (end.querySelector('button') as HTMLButtonElement).focus({ preventScroll: true });
  }

  // ---------- Interfaz y cámara ----------

  private findNear(): Target | null {
    let best: Target | null = null, bd = Infinity;
    for (const n of this.npcs) {
      if (n.flee) continue;
      const d = Math.hypot(n.x - this.player.x, n.z - this.player.z);
      if (d < 3.2 && d < bd) { bd = d; best = { id: n.id, name: n.name, x: n.x, z: n.z, big: false }; }
    }
    for (const s of this.stones) {
      if (!s.grp.visible) continue;
      const d = Math.hypot(s.x - this.player.x, s.z - this.player.z);
      if (d < PICK_R && d < bd + 1) { bd = d; best = { id: 'piedra', name: 'Piedra lisa', x: s.x, z: s.z, big: false, stone: s }; }
    }
    const dg = Math.hypot(this.gpos.x - this.player.x, this.gpos.z - this.player.z);
    if (!this.S.won && dg < 8.5 && dg < bd + 2) best = { id: 'goliat', name: 'Goliat', x: this.gpos.x, z: this.gpos.z, big: true };
    return best;
  }

  private updateUi(): void {
    const m = this.mode, open = this.dialog.open;
    this.near = m === 'explore' && !open ? this.findNear() : null;
    const n = this.near;
    const verb = !n ? null : n.id === 'piedra' ? 'Recoger' : n.big && this.S.stones >= 5 ? 'Enfrentar' : 'Hablar';
    let label: string | null = null;
    if (open) label = 'Seguir';
    else if (m === 'aim') label = this.sling.flying ? null : 'Lanzar';
    else if (m === 'explore') label = verb;
    this.hud.action(m === 'title' || m === 'end' ? null : label);
    this.hud.joystick(m === 'explore' && !open);

    if (!this.near || !verb) { this.hud.hidePrompt(); return; }
    const v = this.tmp.set(this.near.x, H(this.near.x, this.near.z) + (this.near.big ? 4.6 : this.near.id === 'piedra' ? 0.9 : 2.85), this.near.z).project(this.camera);
    if (v.z > 1) { this.hud.hidePrompt(); return; }
    this.hud.prompt(((v.x + 1) / 2) * this.stage.clientWidth, ((1 - v.y) / 2) * this.stage.clientHeight, this.near.name, verb);
  }

  private titleCamera(rdt: number, snap = false): void {
    const a = this.T * 0.05 + 2.2;
    this.camPos.set(Math.sin(a) * 46, 21, Math.cos(a) * 40);
    if (snap) this.camera.position.copy(this.camPos);
    else this.camera.position.lerp(this.camPos, 1 - Math.exp(-rdt * 2));
    this.camera.lookAt(0, 2, 0);
    this.world.sun.place(0, 0);
  }

  private updateCamera(rdt: number): void {
    if (this.mode === 'title') return this.titleCamera(rdt);
    const sl = this.sling;
    if (this.mode === 'approach' || this.mode === 'aim' || this.mode === 'cutscene') {
      // Por encima del hombro derecho de David, mirando la frente del gigante.
      this.camPos.copy(sl.hand).addScaledVector(sl.forward, -4.4).addScaledVector(sl.right, 1.9);
      this.camPos.y += 1.1;
      if (this.mode === 'cutscene' && this.cut && this.cut.t > 1.6) {
        const k = smooth(1.6, 4, this.cut.t);
        this.camPos.addScaledVector(sl.forward, -4 * k);
        this.camPos.y += 3 * k;
      }
      this.look.copy(sl.target);
      this.look.y -= this.mode === 'cutscene' ? 1.5 : 0.4;
    } else {
      const ty = H(this.player.x, this.player.z) + 1.6;
      const p = this.camPitch, h = Math.cos(p) * CAM_DIST;
      this.camPos.set(this.player.x + Math.sin(this.camYaw) * h, ty + Math.sin(p) * CAM_DIST + 0.4, this.player.z + Math.cos(this.camYaw) * h);
      // Al bajar la cámara, la mirada sube: así se ven las laderas y los montes.
      this.look.set(this.player.x, ty + Math.max(0, CAM_PITCH0 - p) * 3.5, this.player.z);
    }
    const ground = H(this.camPos.x, this.camPos.z) + 1.4;
    if (this.camPos.y < ground) this.camPos.y = ground;
    this.camera.position.lerp(this.camPos, 1 - Math.exp(-rdt * (this.mode === 'explore' ? 6 : 3)));
    if (this.shake > 0) {
      this.shake -= rdt;
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.5;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.5;
    }
    this.camera.lookAt(this.look);
    this.world.sun.place(this.player.x, this.player.z);
  }

  // ---------- Pruebas ----------

  /** Atajos para pruebas automáticas (solo con ?debug en la URL). */
  debugApi() {
    const self = this; // eslint-disable-line @typescript-eslint/no-this-alias
    return {
      get mode() { return self.mode; },
      get state() { return self.S; },
      get dialogOpen() { return self.dialog.open; },
      action: () => self.action(),
      talk: (id: Target['id']) => self.talk({ id, name: '', x: 0, z: 0, big: id === 'goliat' }),
      teleport: (x: number, z: number) => { self.player.x = x; self.player.z = z; },
      get goliat() { return { ...self.gpos }; },
      get player() { return { x: self.player.x, z: self.player.z }; },
      stones: () => self.stones.map((s) => ({ x: s.x, z: s.z, visible: s.grp.visible })),
      aimAt: (yaw: number, pitch: number) => { self.sling.yaw = yaw; self.sling.pitch = pitch; },
      solve: () => self.sling.solve(),
      throwStone: () => self.throwStone(),
      skipTo: (stage: 'piedras' | 'gigante') => {
        self.S.food = self.S.saul = true;
        if (stage === 'gigante') self.S.stones = 5;
        for (const s of self.stones) s.grp.visible = stage === 'piedras';
        self.updateQuest();
      },
    };
  }
}
