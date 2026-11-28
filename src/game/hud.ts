import type { LevelDef } from '../levels/types';

// Capa de interfaz en HTML encima del canvas: misión, avisos, nombres flotantes, botón de acción,
// tarjeta de cada nivel y fundido entre escenas.

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id}`);
  return el as T;
};

export class Hud {
  private quest = $('quest');
  private questText = $('questText');
  private questBar = $('questBar');
  private areaEl = $('area');
  private toastEl = $('toast');
  private promptEl = $('prompt');
  private aimEl = $('aimHint');
  private joyEl = $('joy');
  private actEl = $<HTMLButtonElement>('act');
  private timerEl = $('timer');
  private cardEl = $('levelCard');
  private fadeEl = $('fade');
  private toastT = 0;
  private areaT = 0;
  private cardDone: (() => void) | null = null;

  constructor() {
    $('cardBtn').addEventListener('click', () => {
      const f = this.cardDone;
      this.closeCard();
      f?.();
    });
  }

  showQuest(show: boolean): void { this.quest.hidden = !show; }

  /** Texto de la misión y, si hay, el avance (por ejemplo 3 de 5). */
  setQuest(text: string, progress: [number, number] | null): void {
    this.questText.textContent = text;
    this.questBar.hidden = progress === null;
    if (!progress) return;
    const [n, total] = progress;
    while (this.questBar.children.length < total) this.questBar.append(document.createElement('i'));
    while (this.questBar.children.length > total) this.questBar.lastElementChild!.remove();
    [...this.questBar.children].forEach((el, k) => el.classList.toggle('on', k < n));
  }

  /** Reloj del nivel 3 (segundos restantes), o null para ocultarlo. */
  timer(secs: number | null, label = ''): void {
    this.timerEl.hidden = secs === null;
    if (secs === null) return;
    const s = Math.max(0, Math.ceil(secs));
    this.timerEl.textContent = `${label}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    this.timerEl.classList.toggle('low', s <= 20);
  }

  card(def: LevelDef, total: number, onStart: () => void): void {
    $('cardKicker').textContent = `Nivel ${def.n} de ${total}`;
    $('cardTitle').textContent = def.titulo;
    $('cardText').textContent = def.resumen;
    $('cardRef').textContent = def.ref;
    this.cardEl.hidden = false;
    this.cardDone = onStart;
    $<HTMLButtonElement>('cardBtn').focus({ preventScroll: true });
  }

  closeCard(): void {
    this.cardEl.hidden = true;
    this.cardDone = null;
  }

  /** Funde a negro, llama a `mid` y vuelve a mostrar la escena. */
  fade(mid: () => void): void {
    this.fadeEl.classList.add('on');
    setTimeout(() => {
      mid();
      requestAnimationFrame(() => this.fadeEl.classList.remove('on'));
    }, 380);
  }

  toast(text: string, secs = 2.4): void {
    this.toastEl.textContent = text;
    this.toastEl.hidden = false;
    this.toastT = secs;
  }

  area(name: string, sub?: string): void {
    this.areaEl.textContent = name;
    if (sub) {
      const s = document.createElement('small');
      s.textContent = sub;
      this.areaEl.append(s);
    }
    this.areaEl.classList.remove('fade');
    this.areaT = 2.6;
  }

  /** Nombre flotante sobre un personaje, en coordenadas de pantalla. */
  prompt(x: number, y: number, name: string, verb: string): void {
    this.promptEl.hidden = false;
    this.promptEl.replaceChildren();
    const b = document.createElement('b');
    b.textContent = name;
    this.promptEl.append(b, document.createTextNode(` · ${verb}`));
    this.promptEl.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  }

  hidePrompt(): void { this.promptEl.hidden = true; }

  aim(html: string | null): void {
    this.aimEl.hidden = html === null;
    if (html !== null) this.aimEl.innerHTML = html;
  }

  action(label: string | null): void {
    this.actEl.hidden = label === null;
    if (label !== null && this.actEl.textContent !== label) this.actEl.textContent = label;
  }

  joystick(show: boolean): void { this.joyEl.hidden = !show; }

  update(dt: number): void {
    if (this.toastT > 0 && (this.toastT -= dt) <= 0) this.toastEl.hidden = true;
    if (this.areaT > 0 && (this.areaT -= dt) <= 0) this.areaEl.classList.add('fade');
  }

  hideAll(): void {
    this.quest.hidden = true;
    this.hidePrompt();
    this.aim(null);
    this.action(null);
    this.joystick(false);
    this.toastEl.hidden = true;
    this.timer(null);
  }
}
