import * as THREE from 'three';
import { H, type Point, type World } from '../world/ground';
import { mx, eastOfBed, BED_HALF } from '../world/valle/terreno';
import { START, START_YAW, GOLIAT_POS, ESCUDERO_OFFSET, ENGAGE_R, AIM_DIST, STONE_SPOTS, BAGAJE } from '../world/valle/layout';
import { createValle } from '../world/valle';
import { createPerson, animatePerson, type Person } from '../actors/person';
import { DAVID, DAVID_CARGA, DAVID_ARMADURA } from '../content/comun';
import { ELENCO, GOLIAT, ESCUDERO, DIALOGOS as D, MISIONES, ZONAS, AVISOS, type NpcId, ENTRADA } from '../content/nivel4';
import { clamp, lerpAngle, smooth } from '../util/math';
import { softDot } from '../util/materials';
import { Fx } from '../game/fx';
import { Sling, type MissReason } from '../game/sling';
import type { Level, LevelCtx, LevelDef, Target, CamShot } from './types';

type Stage = 'bagaje' | 'hermanos' | 'desafio' | 'preguntar' | 'otro' | 'saul' | 'armadura' | 'quitar' | 'piedras' | 'gigante' | 'approach' | 'aim' | 'cutscene' | 'fin';
type Zone = keyof typeof ZONAS;

interface Npc { id: NpcId; name: string; x: number; z: number; tx: number; tz: number; yaw0: number; p: Person; flee: boolean; side: 'israel' | 'filisteo' }
interface StoneObj { grp: THREE.Group; st: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>; glow: THREE.Sprite; x: number; z: number }

const GOLIAT_SCALE = GOLIAT.scale ?? 1;
/** Goliat espera entre las filas filisteas hasta que sale a desafiar (1 S 17:23). */
const GOLIAT_RANKS: Point = { x: 22, z: 0 };

export const nivel4: LevelDef = {
  n: 4,
  titulo: 'El valle de Ela',
  ref: '1 Samuel 17:20–58',
  resumen: 'Deja la carga, busca a tus hermanos y escucha al gigante. Convence al rey Saúl, junta cinco piedras lisas del arroyo y enfrenta a Goliat.',
  entrada: ENTRADA,
  create: (ctx) => new Valle(ctx),
};

class Valle implements Level {
  world: World;
  start = { x: START.x, z: START.z, yaw: START_YAW };
  look = DAVID_CARGA;

  private stage: Stage = 'bagaje';
  private npcs: Npc[];
  private goliat: Person;
  private gpos: Point = { ...GOLIAT_RANKS };
  private gyaw = -Math.PI / 2;
  private escudero: { p: Person; x: number; z: number; flee: boolean };
  private stones: StoneObj[];
  private nStones = 0;
  private ammo = 5;
  private armorWalk = 0;
  private zone: Zone | '' = '';
  private cut = { t: 0, landed: false, spoke: false };
  private desafioT = 0;
  private retreated = false;
  private fx: Fx;
  private sling: Sling;
  private head = new THREE.Vector3();
  private shot: CamShot = { pos: new THREE.Vector3(), look: new THREE.Vector3(), rate: 3 };

  constructor(private ctx: LevelCtx) {
    this.world = createValle(ctx.lowEnd);
    const scene = this.world.scene;
    this.fx = new Fx(scene);
    this.sling = new Sling(scene);
    this.npcs = ELENCO.map((c) => ({ id: c.id, name: c.name, x: c.x, z: c.z, tx: c.x, tz: c.z, yaw0: c.yaw, side: c.side, flee: false, p: createPerson(scene, c.look, c.x, c.z, c.yaw) }));
    this.goliat = createPerson(scene, GOLIAT, this.gpos.x, this.gpos.z, this.gyaw);
    const ex = GOLIAT_RANKS.x + ESCUDERO_OFFSET.x, ez = GOLIAT_RANKS.z + ESCUDERO_OFFSET.z;
    this.escudero = { p: createPerson(scene, ESCUDERO, ex, ez, -1.7), x: ex, z: ez, flee: false };
    this.stones = this.createStones();
  }

  begin(): void {
    this.zone = '';
    this.checkZone();
    this.updateQuest();
    this.ctx.dialog.say(D.llegada);
  }

  // ---------- Historia ----------

  private say(lines: Parameters<LevelCtx['dialog']['say']>[0], then?: () => void): void { this.ctx.dialog.say(lines, then); }

  private setStage(s: Stage): void {
    this.stage = s;
    this.updateQuest();
  }

  private after(s: Stage): boolean {
    const order: Stage[] = ['bagaje', 'hermanos', 'desafio', 'preguntar', 'otro', 'saul', 'armadura', 'quitar', 'piedras', 'gigante', 'approach', 'aim', 'cutscene', 'fin'];
    return order.indexOf(this.stage) > order.indexOf(s);
  }

  interact(id: string): void {
    const won = this.after('cutscene') || this.stage === 'cutscene';
    if (id.startsWith('piedra-')) return this.pickStone(this.stones[Number(id.slice(7))]);
    switch (id) {
      case 'guarda':
        if (this.stage !== 'bagaje') return this.say(D.guardaDespues);
        return this.say(D.guarda, () => {
          this.ctx.player.setLook(DAVID);
          this.setStage('hermanos');
        });
      case 'eliab':
        if (this.stage === 'bagaje') return this.say(D.eliabAntes);
        if (this.stage === 'hermanos') return this.say(D.saludo, () => this.startDesafio());
        return this.say(D.eliabDespues);
      case 'abinadab': return this.say(this.stage === 'bagaje' ? D.eliabAntes : D.hermano);
      case 'sama': return this.say(this.stage === 'bagaje' ? D.eliabAntes : D.hermanoSama);
      case 'sold1':
        if (won) return this.say(D.soldadoFinal);
        if (this.stage === 'preguntar') return this.say(D.soldado1, () => this.say(D.eliabEnojo, () => this.setStage('otro')));
        return this.say(this.after('otro') ? D.soldadoDespues : D.soldadoAntes);
      case 'sold2':
        if (won) return this.say(D.soldadoFinal);
        if (this.stage === 'otro') return this.say(D.soldado2, () => this.say(D.llamado, () => this.setStage('saul')));
        return this.say(this.after('otro') ? D.soldadoDespues : D.soldadoAntes);
      case 'saul':
        if (this.stage === 'saul') return this.say(D.saul, () => {
          this.ctx.player.setLook(DAVID_ARMADURA);
          this.ctx.player.speed = 0.22;
          this.armorWalk = 0;
          this.ctx.hud.toast(AVISOS.pesada, 2.6);
          this.setStage('armadura');
        });
        return this.say(this.after('saul') ? D.saulDespues : D.saulAntes);
      case 'fil1': case 'fil2': case 'fil3':
        return this.say(D.filisteo);
      case 'goliat':
        if (this.stage !== 'gigante') return this.say(D.goliatAntes);
        return this.confront();
    }
  }

  private updateQuest(): void {
    const s = this.stage;
    const text = s === 'bagaje' ? MISIONES.bagaje : s === 'hermanos' || s === 'desafio' ? MISIONES.hermanos : s === 'preguntar' ? MISIONES.preguntar
      : s === 'otro' ? MISIONES.otro : s === 'saul' ? MISIONES.saul : s === 'armadura' ? MISIONES.armadura : s === 'quitar' ? MISIONES.quitar
        : s === 'piedras' ? MISIONES.piedras : s === 'cutscene' || s === 'fin' ? MISIONES.fin : MISIONES.gigante;
    const bar: [number, number] | null = s === 'piedras' ? [this.nStones, 5] : s === 'aim' ? [this.ammo, 5] : null;
    this.ctx.quest(text, bar);
  }

  /** Goliat sale de las filas y grita; los soldados de Israel retroceden (1 S 17:23–24). */
  private startDesafio(): void {
    this.setStage('desafio');
    this.desafioT = 0;
    this.say(D.desafio, () => {
      // Si el diálogo se pasó rápido, Goliat y los soldados quedan igual en su lugar.
      this.desafioT = Math.max(this.desafioT, 3);
      this.updateDesafio(100);
      this.setStage('preguntar');
    });
  }

  action(): { label: string; run(): void } | null {
    if (this.stage === 'quitar') return { label: 'Quitarse', run: () => this.takeOffArmor() };
    if (this.stage === 'aim' && !this.sling.flying) return { label: 'Lanzar', run: () => this.throwStone() };
    return null;
  }

  private takeOffArmor(): void {
    this.ctx.player.setLook(DAVID);
    this.ctx.player.speed = 1;
    this.say(D.sinArmadura, () => {
      for (const s of this.stones) s.grp.visible = true;
      this.ctx.hud.toast(AVISOS.buscarPiedras, 3.2);
      this.setStage('piedras');
    });
    this.stage = 'piedras';
  }

  canMove(): boolean {
    return !['desafio', 'approach', 'aim', 'cutscene', 'fin'].includes(this.stage);
  }

  // ---------- Ciclo ----------

  update(dt: number, rdt: number): void {
    const pl = this.ctx.player;
    if (this.stage === 'armadura' && pl.moving > 0.05) {
      this.armorWalk += dt;
      if (this.armorWalk > 1.6 && !this.ctx.dialog.open) this.say(D.pesada, () => this.setStage('quitar'));
    }
    if (this.stage === 'desafio') this.updateDesafio(dt);
    this.checkZone();
    this.checkEngage();
    this.updateStones(dt);
    this.updateNpcs(dt);
    if (this.stage === 'approach') this.updateApproach(dt);
    if (this.stage === 'aim') this.updateAim(dt);
    if (this.stage === 'cutscene') this.updateCutscene(dt);
    if (this.stage === 'approach' || this.stage === 'aim' || this.stage === 'cutscene') {
      pl.yaw = lerpAngle(pl.yaw, Math.atan2(this.sling.forward.x, this.sling.forward.z), 1 - Math.exp(-dt * 10));
    }
    this.fx.update(dt);
    void rdt;
  }

  private updateDesafio(dt: number): void {
    this.desafioT += dt;
    // Goliat camina hasta el llano; el escudero va delante.
    const g = this.gpos, dx = GOLIAT_POS.x - g.x, dz = GOLIAT_POS.z - g.z, d = Math.hypot(dx, dz);
    if (d > 0.05) {
      const step = Math.min(d, dt * 1.6);
      g.x += (dx / d) * step;
      g.z += (dz / d) * step;
    }
    this.escudero.x = g.x + ESCUDERO_OFFSET.x;
    this.escudero.z = g.z + ESCUDERO_OFFSET.z;
    // Los de Israel retroceden con miedo.
    if (this.desafioT > 2.5 && !this.retreated) {
      this.retreated = true;
      for (const n of this.npcs) if (n.side === 'israel' && n.id !== 'saul' && n.id !== 'guarda') n.tx = n.x - 3.5;
    }
  }

  private checkZone(): void {
    const sx = this.ctx.player.x - mx(this.ctx.player.z), z: Zone = sx < -(BED_HALF + 4) ? 'israel' : sx <= BED_HALF + 4 ? 'arroyo' : 'filisteo';
    if (z === this.zone) return;
    this.zone = z;
    const info: { nombre: string; sub?: string } = ZONAS[z];
    this.ctx.hud.area(info.nombre, info.sub);
  }

  // ---------- Piedras ----------

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
      this.world.scene.add(grp);
      return { grp, st, glow, x: s.x, z: s.z };
    });
  }

  private updateStones(dt: number): void {
    const pl = this.ctx.player;
    this.stones.forEach((s, i) => {
      if (!s.grp.visible) return;
      // Brillan apenas de lejos y más al acercarse: hay que recorrer el lecho para encontrarlas.
      const d = Math.hypot(s.x - pl.x, s.z - pl.z), near = 1 - smooth(3, 16, d);
      const pulse = 0.5 + Math.sin(this.ctx.T * 4 + i) * 0.5;
      s.st.material.emissiveIntensity = 0.08 + near * (0.15 + pulse * 0.2);
      s.glow.material.opacity = 0.12 + near * (0.3 + pulse * 0.35);
      s.st.rotation.y += dt * 0.6;
      s.grp.position.y = H(s.x, s.z) + 0.12;
    });
  }

  private pickStone(s: StoneObj | undefined): void {
    if (!s || !s.grp.visible) return;
    s.grp.visible = false;
    this.nStones++;
    this.updateQuest();
    this.ctx.hud.toast(AVISOS.piedra(this.nStones));
    if (this.nStones === 5) setTimeout(() => this.say(D.piedrasCompletas, () => this.setStage('gigante')), 500);
  }

  // ---------- Personajes ----------

  private updateNpcs(dt: number): void {
    const T = this.ctx.T, pl = this.ctx.player, free = this.stage !== 'desafio';
    for (const n of this.npcs) {
      if (n.flee) {
        n.x += dt * 8;
        n.p.g.rotation.y = lerpAngle(n.p.g.rotation.y, Math.PI / 2, 0.2);
        n.p.g.position.set(n.x, H(n.x, n.z), n.z);
        animatePerson(n.p, 1, dt, T);
        if (n.x > 60) n.p.g.visible = false;
        continue;
      }
      // Camina hacia su lugar (retroceden con miedo cuando sale Goliat).
      const mdx = n.tx - n.x, mdz = n.tz - n.z, md = Math.hypot(mdx, mdz);
      let walking = 0;
      if (md > 0.05) {
        const step = Math.min(md, dt * 2.2);
        n.x += (mdx / md) * step;
        n.z += (mdz / md) * step;
        walking = 0.5;
      }
      const d = Math.hypot(pl.x - n.x, pl.z - n.z);
      const want = d < 7 && free ? Math.atan2(pl.x - n.x, pl.z - n.z) : n.side === 'israel' && this.stage === 'desafio' ? Math.atan2(this.gpos.x - n.x, this.gpos.z - n.z) : n.yaw0;
      n.p.g.rotation.y = lerpAngle(n.p.g.rotation.y, want, 1 - Math.exp(-dt * 4));
      n.p.g.position.set(n.x, H(n.x, n.z), n.z);
      animatePerson(n.p, walking, dt, T);
    }
    const e = this.escudero;
    if (e.flee) {
      e.x += dt * 7;
      e.p.g.rotation.y = lerpAngle(e.p.g.rotation.y, Math.PI / 2, 0.2);
    }
    e.p.g.position.set(e.x, H(e.x, e.z), e.z);
    animatePerson(e.p, e.flee || this.stage === 'approach' || (this.stage === 'desafio' && this.gpos.x > GOLIAT_POS.x + 0.1) ? 1 : 0, dt, T);
    this.goliat.g.position.set(this.gpos.x, H(this.gpos.x, this.gpos.z), this.gpos.z);
    this.goliat.g.rotation.y = this.gyaw;
    const gWalk = this.stage === 'approach' || (this.stage === 'desafio' && this.gpos.x > GOLIAT_POS.x + 0.1);
    if (!this.after('aim') && !gWalk) {
      this.goliat.armR.rotation.x = -0.25 + Math.sin(T * 1.3) * 0.12;
      this.goliat.armL.rotation.x = Math.sin(T * 1.3 + 1) * 0.1;
    }
    animatePerson(this.goliat, gWalk ? 0.6 : 0, dt, T);
  }

  colliders() {
    const dyn = this.npcs.filter((n) => !n.flee).map((n) => ({ x: n.x, z: n.z, r: 0.7 }));
    dyn.push({ x: this.gpos.x, z: this.gpos.z, r: 1.4 });
    if (!this.escudero.flee) dyn.push({ x: this.escudero.x, z: this.escudero.z, r: 0.9 });
    return dyn;
  }

  targets(): Target[] {
    const out: Target[] = [];
    for (const n of this.npcs) if (!n.flee && this.stage !== 'fin') out.push({ id: n.id, name: n.name, verb: 'Hablar', x: n.x, z: n.z });
    this.stones.forEach((s, i) => { if (s.grp.visible) out.push({ id: `piedra-${i}`, name: 'Piedra lisa', verb: 'Recoger', x: s.x, z: s.z, y: 0.9, r: 1.7 }); });
    if (!this.after('gigante') && this.after('desafio')) out.push({ id: 'goliat', name: 'Goliat', verb: this.stage === 'gigante' ? 'Enfrentar' : 'Hablar', x: this.gpos.x, z: this.gpos.z, y: 4.6, r: 8.5 });
    return out;
  }

  // ---------- Enfrentamiento ----------

  private headPos(out: THREE.Vector3): THREE.Vector3 {
    return out.set(this.gpos.x, H(this.gpos.x, this.gpos.z) + 2.02 * GOLIAT_SCALE + 0.05, this.gpos.z);
  }

  /** Con las cinco piedras, al cruzar el arroyo y acercarse, Goliat sale a su encuentro. */
  private checkEngage(): void {
    if (this.stage !== 'gigante' || this.ctx.dialog.open) return;
    const pl = this.ctx.player;
    if (eastOfBed(pl.x, pl.z) && Math.hypot(this.gpos.x - pl.x, this.gpos.z - pl.z) < ENGAGE_R) this.confront();
  }

  /** El filisteo avanza con su escudero delante (1 S 17:41) y después habla. */
  private confront(): void {
    this.stage = 'approach';
    this.ctx.hud.toast(AVISOS.acerca, 2.2);
  }

  private updateApproach(dt: number): void {
    const pl = this.ctx.player, g = this.gpos;
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
    if (this.ctx.dialog.open) return;
    this.say(D.goliat, () => this.startAim());
  }

  private startAim(): void {
    // David se queda donde está: ya cruzó el arroyo y tiene al gigante enfrente.
    const pl = this.ctx.player;
    this.stage = 'aim';
    this.ammo = 5;
    this.sling.setBasis(pl.x, pl.z, this.headPos(this.head));
    this.sling.reset();
    pl.person.sling = true;
    this.ctx.hud.aim(AVISOS.apuntar);
    this.ctx.hud.toast(AVISOS.corre, 2);
    this.updateQuest();
  }

  drag = {
    start: () => {
      if (this.stage !== 'aim') return false;
      this.sling.beginDrag();
      return true;
    },
    move: (dx: number, dy: number) => this.sling.dragTo(dx, dy),
    end: (cancelled: boolean) => { if (!cancelled) this.throwStone(); },
  };

  private throwStone(): void {
    if (this.stage !== 'aim' || this.sling.flying) return;
    if (this.ammo <= 0) this.ammo = 5;
    this.ammo--;
    this.updateQuest();
    this.sling.launch();
    this.ctx.hud.aim(null);
  }

  private hitsBody = (p: THREE.Vector3): boolean => {
    const gy = H(this.gpos.x, this.gpos.z), dx = p.x - this.gpos.x, dz = p.z - this.gpos.z;
    return p.y > gy && p.y < gy + 1.8 * GOLIAT_SCALE && dx * dx + dz * dz < 1.05 * 1.05;
  };

  private updateAim(dt: number): void {
    const pl = this.ctx.player;
    this.sling.setBasis(pl.x, pl.z, this.headPos(this.head));
    pl.person.armR.rotation.x = -2.7 + Math.sin(this.ctx.T * 13) * 0.25;
    if (!this.sling.flying) { this.sling.showAiming(this.ctx.T); return; }
    const r = this.sling.step(dt, this.hitsBody);
    if (!r) return;
    if (r.kind === 'hit') return this.win(r.at);
    this.fx.dust(r.at.x, r.at.y, r.at.z, 10, 0.6);
    const msg: Record<MissReason, string> = { armor: AVISOS.coraza, high: AVISOS.alto, low: AVISOS.bajo, right: AVISOS.derecha, left: AVISOS.izquierda, long: AVISOS.largo };
    this.ctx.hud.toast(msg[r.reason] + (this.ammo > 0 ? AVISOS.quedan(this.ammo) : ''), 2.4);
    setTimeout(() => {
      if (this.stage !== 'aim') return;
      this.ctx.hud.aim(AVISOS.apuntar);
      if (this.ammo <= 0) { this.ammo = 5; this.updateQuest(); this.ctx.hud.toast(AVISOS.recarga, 2); }
    }, 600);
  }

  private win(at: THREE.Vector3): void {
    this.stage = 'cutscene';
    this.ctx.slow(1.1);
    this.ctx.shake(0.5);
    this.cut = { t: 0, landed: false, spoke: false };
    this.sling.hide();
    this.ctx.player.person.sling = false;
    this.ctx.hud.aim(null);
    this.fx.dust(at.x, at.y, at.z, 16, 0.9);
    this.updateQuest();
  }

  private updateCutscene(dt: number): void {
    const c = this.cut;
    c.t += dt;
    // Cae hacia adelante, sobre su rostro (1 S 17:49).
    const k = clamp((c.t - 0.35) / 1.25, 0, 1);
    this.goliat.rig.rotation.x = k * k * (Math.PI / 2) * 0.98;
    this.goliat.rig.position.y = Math.sin((k * Math.PI) / 2) * 0.45;
    if (k >= 1 && !c.landed) {
      c.landed = true;
      this.ctx.shake(0.6);
      // Cae hacia adelante, del lado de David.
      const gx = this.gpos.x + Math.sin(this.gyaw) * 3.5, gz = this.gpos.z + Math.cos(this.gyaw) * 3.5;
      this.fx.dust(gx, H(gx, gz) + 0.3, gz, 40, 2.2);
    }
    if (c.t > 2.2 && !c.spoke) {
      c.spoke = true;
      this.say(D.victoria, () => {
        for (const n of this.npcs) { if (n.side === 'filisteo') n.flee = true; else n.p.armsUp = true; }
        this.escudero.flee = true;
        setTimeout(() => this.presentToSaul(), 2600);
      });
    }
  }

  /** Abner lleva a David ante Saúl (1 S 17:55–58). */
  private presentToSaul(): void {
    const saul = this.npcs.find((n) => n.id === 'saul')!;
    this.stage = 'fin';
    this.ctx.fade(() => {
      for (const n of this.npcs) n.p.armsUp = false;
      this.ctx.player.teleport(saul.x + 2.4, saul.z + 1.2, Math.atan2(saul.x - (saul.x + 2.4), saul.z - (saul.z + 1.2)));
      this.ctx.snapCamera();
      this.say(D.abner, () => this.ctx.complete());
    });
  }

  camera(): CamShot | null {
    const pl = this.ctx.player, s = this.shot;
    if (this.stage === 'desafio') {
      // Desde detrás de la línea de Israel, mirando al gigante que sale al llano.
      const dx = pl.x - this.gpos.x, dz = pl.z - this.gpos.z, d = Math.hypot(dx, dz) || 1;
      s.pos.set(pl.x + (dx / d) * 6 + (dz / d) * 2, H(pl.x, pl.z) + 4.5, pl.z + (dz / d) * 6 - (dx / d) * 2);
      this.headPos(s.look);
      s.look.y -= 1;
      s.rate = 2;
      return s;
    }
    if (this.stage !== 'approach' && this.stage !== 'aim' && this.stage !== 'cutscene') return null;
    // Por encima del hombro derecho de David, mirando la frente del gigante.
    const sl = this.sling;
    s.pos.copy(sl.hand).addScaledVector(sl.forward, -4.4).addScaledVector(sl.right, 1.9);
    s.pos.y += 1.1;
    if (this.stage === 'cutscene' && this.cut.t > 1.6) {
      const k = smooth(1.6, 4, this.cut.t);
      s.pos.addScaledVector(sl.forward, -4 * k);
      s.pos.y += 3 * k;
    }
    s.look.copy(sl.target);
    s.look.y -= this.stage === 'cutscene' ? 1.5 : 0.4;
    s.rate = 3;
    return s;
  }

  debug() {
    return {
      stage: this.stage, stones: this.nStones, ammo: this.ammo, goliat: { ...this.gpos },
      stoneSpots: this.stones.map((s) => ({ x: s.x, z: s.z, visible: s.grp.visible })),
      aimAt: (yaw: number, pitch: number) => { this.sling.yaw = yaw; this.sling.pitch = pitch; },
      solve: () => this.sling.solve(),
      throwStone: () => this.throwStone(),
      bagaje: BAGAJE,
    };
  }
}
