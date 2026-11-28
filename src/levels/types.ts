import type * as THREE from 'three';
import type { World, Collider } from '../world/ground';
import type { Look, Person } from '../actors/person';
import type { Hud } from '../game/hud';
import type { Dialog } from '../game/dialog';

/** Algo con lo que el jugador puede interactuar si está cerca (hablar, recoger, etc.). */
export interface Target {
  id: string;
  name: string;
  verb: string;
  x: number;
  z: number;
  /** Altura de la etiqueta sobre el suelo. */
  y?: number;
  /** Distancia para alcanzarlo. */
  r?: number;
}

/** Toma de cámara fija o guiada por el nivel (escenas, apuntar con la honda). */
export interface CamShot {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  /** Qué tan rápido se acerca a la toma (más alto = más rápido). */
  rate?: number;
}

export interface PlayerApi {
  x: number;
  z: number;
  yaw: number;
  readonly person: Person;
  /** Multiplicador de velocidad (la armadura o la carga frenan). */
  speed: number;
  /** Último valor de avance (0 quieto, 1 corriendo). */
  readonly moving: number;
  setLook(look: Look): void;
  teleport(x: number, z: number, yaw?: number): void;
}

/** Lo que el juego le presta a cada nivel. */
export interface LevelCtx {
  readonly hud: Hud;
  readonly dialog: Dialog;
  readonly player: PlayerApi;
  readonly camera: THREE.PerspectiveCamera;
  readonly lowEnd: boolean;
  /** Tiempo de juego acumulado. */
  readonly T: number;
  quest(text: string, progress?: [number, number] | null): void;
  /** Termina el nivel y pasa al siguiente. */
  complete(): void;
  /** Cámara lenta durante unos segundos. */
  slow(secs: number): void;
  shake(secs: number): void;
  /** Funde a negro, ejecuta `mid` y vuelve. */
  fade(mid: () => void): void;
  /** Vuelve la cámara detrás del jugador (después de un teletransporte). */
  snapCamera(): void;
}

export interface Level {
  world: World;
  start: { x: number; z: number; yaw: number };
  look: Look;
  /** Se llama cuando el jugador cierra la tarjeta del nivel. */
  begin(): void;
  update(dt: number, rdt: number): void;
  targets(): Target[];
  interact(id: string): void;
  /** Obstáculos que se mueven (animales, personajes). */
  colliders?(): Collider[];
  camera?(): CamShot | null;
  /** Acción del botón cuando no hay nada cerca (golpear, lanzar...). */
  action?(): { label: string; run(): void } | null;
  /** Si es false, el joystick no mueve a David. */
  canMove?(): boolean;
  /** Si `start` devuelve true, el arrastre es del nivel (apuntar) y no mueve la cámara. */
  drag?: { start(): boolean; move(dx: number, dy: number): void; end(cancelled: boolean): void };
  debug?(): Record<string, unknown>;
}

export interface LevelDef {
  n: number;
  titulo: string;
  ref: string;
  resumen: string;
  create(ctx: LevelCtx): Level;
}
