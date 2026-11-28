import { mx } from './terrain';

// Ubicaciones del episodio 1 (valle de Ela). Unidades ≈ metros.

export interface Point { x: number; z: number }
export interface Collider extends Point { r: number }
export type TentKind = 'goat' | 'cream' | 'royal' | 'red' | 'stripe';
export interface TentDef extends Point { rot: number; kind: TentKind }

export const START: Point = { x: -34, z: 17 };
/** Donde se para David para usar la honda, del lado oeste del arroyo. */
export const STAND: Point = { x: -4.2, z: 1 };
export const GOLIAT_POS: Point = { x: 9, z: 1 };
export const ESCUDERO_POS: Point = { x: 10.5, z: 4.2 };
export const FIRE: Point = { x: -18, z: 4 };

/** Límite caminable (elipse). */
export const BOUNDS = { rx: 47, rz: 39 };

export const TENTS: TentDef[] = [
  { x: -28, z: -12, rot: 0.3, kind: 'goat' },
  { x: -22, z: -17, rot: -0.2, kind: 'cream' },
  { x: -14, z: -14, rot: 0.5, kind: 'goat' },
  { x: -31, z: -2, rot: 1.4, kind: 'cream' },
  { x: -31, z: 9, rot: 0.8, kind: 'goat' },
  { x: -21, z: 12, rot: -0.4, kind: 'cream' },
  { x: -22, z: -5, rot: 0.15, kind: 'royal' },
  { x: 21, z: -14, rot: -0.3, kind: 'red' },
  { x: 28, z: -5, rot: 0.4, kind: 'stripe' },
  { x: 29, z: 8, rot: -0.6, kind: 'red' },
  { x: 21, z: 15, rot: 0.2, kind: 'stripe' },
  { x: 33, z: -15, rot: 0.9, kind: 'red' },
];

/** Las cinco piedras lisas, alternando orillas del arroyo (1 S 17:40). */
export const STONE_SPOTS: Point[] = ([[-14, 1], [-6, -1], [2, 1], [9, -1], [17, 1]] as const).map(([z, side]) => ({ x: mx(z) + side * 3.3, z }));

export const SHEEP_SPOTS: Point[] = [{ x: -37, z: 22 }, { x: -33, z: 25 }, { x: -40, z: 26 }, { x: -31, z: 21.5 }];
