import { RETRATOS, type Line } from '../content/comun';

const CHARS_PER_SECOND = 70;

/** Cuadro de diálogo con efecto de máquina de escribir. */
export class Dialog {
  open = false;
  private lines: Line[] = [];
  private i = 0;
  private shown = 0;
  private onEnd: (() => void) | null = null;
  private box = document.getElementById('dlg')!;
  private portrait = document.getElementById('portrait')!;
  private name = document.getElementById('dlgName')!;
  private text = document.getElementById('dlgText')!;
  private ref = document.getElementById('dlgRef')!;
  private live = document.getElementById('live')!;

  say(lines: Line[], onEnd?: () => void): void {
    this.lines = lines;
    this.i = 0;
    this.open = true;
    this.onEnd = onEnd ?? null;
    this.box.hidden = false;
    this.showLine();
  }

  /** Cierra sin llamar al final (al cambiar de nivel). */
  close(): void {
    this.open = false;
    this.onEnd = null;
    this.box.hidden = true;
  }

  /** Completa la línea actual o pasa a la siguiente. */
  advance(): void {
    const l = this.lines[this.i];
    if (this.shown < l.text.length) {
      this.shown = l.text.length;
      this.text.textContent = l.text;
      return;
    }
    this.i++;
    if (this.i >= this.lines.length) {
      this.open = false;
      this.box.hidden = true;
      const f = this.onEnd;
      this.onEnd = null;
      f?.();
      return;
    }
    this.showLine();
  }

  update(dt: number): void {
    if (!this.open) return;
    const l = this.lines[this.i];
    if (this.shown < l.text.length) {
      this.shown = Math.min(l.text.length, this.shown + dt * CHARS_PER_SECOND);
      this.text.textContent = l.text.slice(0, this.shown | 0);
    }
  }

  private showLine(): void {
    const l = this.lines[this.i];
    this.shown = 0;
    this.name.textContent = l.who;
    this.ref.textContent = l.ref ?? '';
    this.portrait.textContent = l.who[0];
    this.portrait.style.background = RETRATOS[l.who] ?? '#4a4136';
    this.text.textContent = '';
    this.live.textContent = `${l.who}: ${l.text}`;
  }
}
