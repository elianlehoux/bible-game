// Entrada: teclado, joystick táctil, botón de acción y arrastre sobre la escena.

export interface DragHandlers {
  start(x: number, y: number): void;
  move(dx: number, dy: number): void;
  end(cancelled: boolean): void;
}

const KEYMAP: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};

export class Input {
  /** Se llama al tocar el botón de acción o con Espacio / Enter / E. */
  onAction: () => void = () => {};
  /** Se llama al tocar la escena mientras hay un diálogo abierto. */
  onTap: () => void = () => {};
  drag: DragHandlers | null = null;
  /** Si es false, las teclas no se capturan (por ejemplo, en la pantalla de título). */
  active = false;

  private keys = new Set<string>();
  private joy = { x: 0, y: 0 };
  private joyId: number | null = null;
  private dragId: number | null = null;
  private dragFrom = { x: 0, y: 0 };

  constructor(stage: HTMLElement, joyEl: HTMLElement, knob: HTMLElement, act: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      const k = KEYMAP[e.code];
      if (k) { this.keys.add(k); e.preventDefault(); return; }
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
        if (e.target instanceof HTMLButtonElement && e.code !== 'KeyE') return;
        e.preventDefault();
        if (!e.repeat) this.onAction();
      }
    });
    window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) this.keys.delete(k); });
    window.addEventListener('blur', () => this.keys.clear());

    const moveJoy = (e: PointerEvent) => {
      const r = joyEl.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const R = r.width * 0.36, d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      this.joy.x = dx / R;
      this.joy.y = dy / R;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    const endJoy = (e: PointerEvent) => {
      if (e.pointerId !== this.joyId) return;
      this.joyId = null;
      this.joy.x = this.joy.y = 0;
      knob.style.transform = '';
    };
    joyEl.addEventListener('pointerdown', (e) => {
      this.joyId = e.pointerId;
      joyEl.setPointerCapture(e.pointerId);
      moveJoy(e);
      e.preventDefault();
      e.stopPropagation();
    });
    joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === this.joyId) moveJoy(e); });
    joyEl.addEventListener('pointerup', endJoy);
    joyEl.addEventListener('pointercancel', endJoy);

    act.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.onAction(); });
    act.addEventListener('click', (e) => { if (e.detail === 0) this.onAction(); }); // teclado / lector de pantalla

    stage.addEventListener('pointerdown', (e) => {
      if (!(e.target instanceof Element) || e.target.closest('button, .joy, .overlay')) return;
      this.onTap();
      if (!this.drag) return;
      this.dragId = e.pointerId;
      this.dragFrom = { x: e.clientX, y: e.clientY };
      this.drag.start(e.clientX, e.clientY);
      try { stage.setPointerCapture(e.pointerId); } catch { /* el puntero ya se soltó */ }
    });
    stage.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.dragId) this.drag?.move(e.clientX - this.dragFrom.x, e.clientY - this.dragFrom.y);
    });
    const endDrag = (e: PointerEvent, cancelled: boolean) => {
      if (e.pointerId !== this.dragId) return;
      this.dragId = null;
      this.drag?.end(cancelled);
    };
    stage.addEventListener('pointerup', (e) => endDrag(e, false));
    stage.addEventListener('pointercancel', (e) => endDrag(e, true));
  }

  /** Dirección pedida por el jugador: x a la derecha, y hacia abajo (como en pantalla). */
  axis(): { x: number; y: number } {
    let x = this.joy.x, y = this.joy.y;
    if (this.keys.has('left')) x -= 1;
    if (this.keys.has('right')) x += 1;
    if (this.keys.has('up')) y -= 1;
    if (this.keys.has('down')) y += 1;
    return { x, y };
  }
}
