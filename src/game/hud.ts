// Capa de interfaz en HTML encima del canvas: misión, avisos, nombres flotantes y botón de acción.

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
  private toastT = 0;
  private areaT = 0;

  showQuest(show: boolean): void { this.quest.hidden = !show; }

  setQuest(text: string, filled: number | null): void {
    this.questText.textContent = text;
    this.questBar.hidden = filled === null;
    [...this.questBar.children].forEach((el, k) => el.classList.toggle('on', filled !== null && k < filled));
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
  }
}
