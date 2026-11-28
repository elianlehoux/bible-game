import * as THREE from 'three';
import { H, type Collider, type World } from '../world/ground';
import { createBelen, REDIL, PATIO, SALIDA } from '../world/belen';
import { createSheep, updateSheep, type Sheep } from '../actors/sheep';
import { createPerson, animatePerson, type Person } from '../actors/person';
import { DAVID, DAVID_CARGA, ISAI, PASTOR } from '../content/comun';
import { DIALOGOS as D, MISIONES, ITEMS, AVISOS, ENTRADA } from '../content/nivel2';
import { lerpAngle, rand } from '../util/math';
import { mat, mesh } from '../util/materials';
import type { CamShot, Level, LevelCtx, LevelDef, Target } from './types';

type Stage = 'isai' | 'tareas' | 'partir' | 'fin';
type ItemId = (typeof ITEMS)[number]['id'];

export const nivel2: LevelDef = {
  n: 2,
  titulo: 'El encargo de Isaí',
  ref: '1 Samuel 17:12–20',
  resumen: 'Tu padre te pide llevar comida a tus hermanos, que están en la guerra. Deja el rebaño en buenas manos, prepara la carga y sal hacia el valle de Ela.',
  entrada: ENTRADA,
  create: (ctx) => new Encargo(ctx),
};

interface Npc { p: Person; x: number; z: number; yaw0: number }

/** Grano, panes y quesos en el patio de la casa de Isaí. */
function createItem(scene: THREE.Scene, id: ItemId, x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, H(x, z), z);
  if (id === 'grano') {
    const s = mesh(new THREE.IcosahedronGeometry(0.42, 1), mat('#c9ad74'), 0, 0.4, 0);
    s.scale.set(1, 1.15, 0.9);
    g.add(s, mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.18, 6), mat('#8a6a3a'), 0, 0.88, 0));
  } else if (id === 'panes') {
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.32, 9), mat('#a37a44'), 0, 0.16, 0));
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05, b = mesh(new THREE.IcosahedronGeometry(0.16, 0), mat('#d9a35a'), Math.cos(a) * 0.25, 0.38, Math.sin(a) * 0.25);
      b.scale.set(1.2, 0.6, 1.2);
      g.add(b);
    }
  } else {
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 9), mat('#ece0b4'), (i % 2) * 0.1, 0.07 + i * 0.13, 0));
  }
  scene.add(g);
  return g;
}

class Encargo implements Level {
  world: World;
  start = { x: REDIL.x - REDIL.r - 2.5, z: REDIL.z + 1.5, yaw: -2.2 };
  look = DAVID;

  private stage: Stage = 'isai';
  private flock: Sheep[] = [];
  private isai: Npc;
  private pastor: Npc;
  private pastorOk = false;
  private loaded = false;
  private items: { id: ItemId; g: THREE.Group; got: boolean }[];
  private T0 = 0;
  /** Toma final: David sale por el camino del oeste (-1 = todavía no). */
  private endT = -1;
  private shot: CamShot = { pos: new THREE.Vector3(), look: new THREE.Vector3(), rate: 0.9 };

  constructor(private ctx: LevelCtx) {
    this.world = createBelen(ctx.lowEnd, 'manana');
    const scene = this.world.scene;
    for (let i = 0; i < 8; i++) {
      const a = rand() * Math.PI * 2, r = rand() * (REDIL.r - 2.2);
      const s = createSheep(scene, REDIL.x + Math.cos(a) * r, REDIL.z + Math.sin(a) * r, i % 4 === 2 ? 0.6 : 1);
      s.roam = 1.2;
      this.flock.push(s);
    }
    const ix = PATIO.x, iz = PATIO.z + 3;
    this.isai = { p: createPerson(scene, ISAI, ix, iz, 0.6), x: ix, z: iz, yaw0: 0.6 };
    const px = REDIL.x - REDIL.r - 1.2, pz = REDIL.z - 2.5;
    this.pastor = { p: createPerson(scene, PASTOR, px, pz, -1.2), x: px, z: pz, yaw0: -1.2 };
    this.pastor.p.g.visible = false;
    this.items = ITEMS.map((it, i) => ({ id: it.id, got: false, g: createItem(scene, it.id, PATIO.x - 2.2 + i * 2.2, PATIO.z + 0.8 - (i % 2) * 1.2) }));
  }

  begin(): void {
    this.ctx.hud.area('Belén', 'La mañana siguiente');
    this.updateQuest();
    this.ctx.dialog.say(D.intro);
  }

  private done(): number { return (this.pastorOk ? 1 : 0) + this.items.filter((i) => i.got).length; }

  private updateQuest(): void {
    if (this.stage === 'isai') this.ctx.quest(MISIONES.isai);
    else if (this.stage === 'tareas') this.ctx.quest(MISIONES.tareas, [this.done(), 4]);
    else this.ctx.quest(MISIONES.partir);
  }

  targets(): Target[] {
    const out: Target[] = [];
    if (this.stage !== 'isai') out.push({ id: 'isai', name: 'Isaí', verb: 'Hablar', x: this.isai.x, z: this.isai.z });
    if (this.pastor.p.g.visible) out.push({ id: 'pastor', name: 'Pastor', verb: 'Hablar', x: this.pastor.x, z: this.pastor.z });
    if (this.stage === 'tareas') for (const it of this.items) if (!it.got) out.push({ id: it.id, name: ITEMS.find((i) => i.id === it.id)!.nombre, verb: 'Recoger', x: it.g.position.x, z: it.g.position.z, y: 1.2, r: 1.9 });
    return out;
  }

  interact(id: string): void {
    if (id === 'isai') return this.ctx.dialog.say(D.isaiDespues);
    if (id === 'pastor') {
      if (this.pastorOk) return this.ctx.dialog.say(D.pastorDespues);
      return this.ctx.dialog.say(D.pastor, () => { this.pastorOk = true; this.checkTasks(); });
    }
    const it = this.items.find((i) => i.id === id);
    if (!it || it.got) return;
    it.got = true;
    it.g.visible = false;
    this.ctx.hud.toast(ITEMS.find((i) => i.id === id)!.aviso, 2);
    this.checkTasks();
  }

  private checkTasks(): void {
    if (this.items.every((i) => i.got) && !this.loaded) {
      this.loaded = true;
      this.ctx.player.setLook(DAVID_CARGA);
      this.ctx.player.speed = 0.9;
    }
    if (this.done() === 4) this.stage = 'partir';
    this.updateQuest();
  }

  colliders(): Collider[] {
    const out: Collider[] = [{ x: this.isai.x, z: this.isai.z, r: 0.6 }];
    if (this.pastor.p.g.visible) out.push({ x: this.pastor.x, z: this.pastor.z, r: 0.6 });
    for (const s of this.flock) out.push({ x: s.g.position.x, z: s.g.position.z, r: 0.5 });
    return out;
  }

  canMove(): boolean { return this.endT < 0; }

  camera(): CamShot | null {
    if (this.endT < 0) return null;
    // David se va por el camino; atrás queda Belén.
    const pl = this.ctx.player, y = H(pl.x, pl.z);
    this.shot.pos.set(pl.x + 6, y + 4, pl.z + 7);
    this.shot.look.set(pl.x - 4, y + 1.2, pl.z - 1);
    return this.shot;
  }

  update(dt: number): void {
    this.T0 += dt;
    if (this.endT >= 0) {
      // Camina solo hacia el oeste unos segundos y termina el nivel.
      const pl = this.ctx.player;
      this.endT += dt;
      pl.yaw = lerpAngle(pl.yaw, -Math.PI / 2 - 0.25, 1 - Math.exp(-dt * 4));
      pl.x -= dt * 2.6 * Math.cos(0.25);
      pl.z -= dt * 2.6 * Math.sin(0.25);
      animatePerson(pl.person, 0.45, dt, this.ctx.T);
      if (this.endT > 3.2) { this.endT = -2; this.ctx.complete(); }
    }
    const pl = this.ctx.player, T = this.ctx.T;
    for (const s of this.flock) updateSheep(s, dt, T);

    // Isaí camina desde la casa hasta David y le da el encargo.
    const isai = this.isai, dx = pl.x - isai.x, dz = pl.z - isai.z, d = Math.hypot(dx, dz);
    let walk = 0;
    if (this.stage === 'isai' && !this.ctx.dialog.open) {
      if (d > 2.4) {
        const v = Math.min(d - 2.4, dt * 2.6);
        isai.x += (dx / d) * v;
        isai.z += (dz / d) * v;
        walk = 0.5;
      } else {
        this.ctx.dialog.say(D.isai, () => {
          this.stage = 'tareas';
          this.pastor.p.g.visible = true;
          this.updateQuest();
        });
      }
    }
    for (const n of [isai, this.pastor]) {
      const nd = Math.hypot(pl.x - n.x, pl.z - n.z);
      const want = nd < 8 ? Math.atan2(pl.x - n.x, pl.z - n.z) : n.yaw0;
      n.p.g.rotation.y = lerpAngle(n.p.g.rotation.y, n === isai && walk ? Math.atan2(dx, dz) : want, 1 - Math.exp(-dt * 5));
      n.p.g.position.set(n.x, H(n.x, n.z), n.z);
      animatePerson(n.p, n === isai ? walk : 0, dt, T);
    }

    // La salida hacia el valle de Ela.
    if (Math.hypot(pl.x - SALIDA.x, pl.z - SALIDA.z) < 3.5 && !this.ctx.dialog.open && this.stage !== 'fin') {
      if (this.stage === 'partir') {
        this.stage = 'fin';
        this.ctx.dialog.say(D.partida, () => { this.endT = 0; });
      } else if (this.stage === 'tareas' && this.T0 > 1) {
        this.T0 = -2; // no repetir el aviso enseguida
        const falta = [!this.pastorOk && AVISOS.pastor, this.items.some((i) => !i.got) && AVISOS.carga].filter(Boolean).join(' y ');
        this.ctx.hud.toast(AVISOS.falta(falta), 2.6);
      }
    }
  }

  debug() {
    return { stage: this.stage, done: this.done(), isai: { x: this.isai.x, z: this.isai.z }, pastor: { x: this.pastor.x, z: this.pastor.z }, salida: SALIDA, items: this.items.map((i) => ({ id: i.id, x: i.g.position.x, z: i.g.position.z, got: i.got })) };
  }
}
