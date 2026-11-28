import { mx } from './terreno';
import type { Point } from '../ground';
import type { TentDef } from '../kit';

// Ubicaciones del episodio 1 (valle de Ela). Unidades ≈ metros, con las distancias reales comprimidas.
//
// El valle real (Wadi es-Sunt) corre de este a oeste. Aquí el eje Z es ese eje: -z es el este
// (aguas arriba, hacia Belén) y +z el oeste (hacia Gat). Cada ejército acampa en la ladera de
// un monte y el valle queda en medio (1 S 17:3). No se sabe con certeza qué ladera ocupaba cada
// uno: Israel queda en x < 0 y los filisteos en x > 0, así el sol de la tarde ilumina a Goliat.


/** David llega desde el este, desde Belén (1 S 17:20). */
export const START: Point = { x: -24, z: -29 };
export const START_YAW = 0;
/** Goliat sale de las filas filisteas y se para en el llano, de su lado del arroyo (1 S 17:4, 8). */
export const GOLIAT_POS: Point = { x: 16, z: 2 };
/** El escudero va delante de él (1 S 17:7, 41). */
export const ESCUDERO_OFFSET: Point = { x: -1.9, z: 1.6 };
export const FIRE: Point = { x: -25, z: 7 };
/** Donde David deja la carga al llegar (1 S 17:22). */
export const BAGAJE: Point = { x: -19, z: -23 };

/** A esta distancia de Goliat, con las cinco piedras, empieza el enfrentamiento. */
export const ENGAGE_R = 15;
/** Goliat avanza hacia David hasta quedar a esta distancia (1 S 17:41, 48). */
export const AIM_DIST = 12;

/** Límite caminable (elipse). */
export const BOUNDS = { rx: 47, rz: 39 };

export const TENTS: TentDef[] = [
  // Israel, en la ladera sur
  { x: -30, z: -14, rot: 0.3, kind: 'goat' },
  { x: -24, z: -19, rot: -0.2, kind: 'cream' },
  { x: -35, z: -4, rot: 1.4, kind: 'cream' },
  { x: -33, z: 9, rot: 0.8, kind: 'goat' },
  { x: -26, z: 15, rot: -0.4, kind: 'cream' },
  { x: -37, z: 18, rot: 0.6, kind: 'goat' },
  { x: -29, z: -5, rot: 0.15, kind: 'royal' },
  // Filisteos, en la ladera norte
  { x: 27, z: -13, rot: -0.3, kind: 'red' },
  { x: 31, z: -3, rot: 0.4, kind: 'stripe' },
  { x: 30, z: 9, rot: -0.6, kind: 'red' },
  { x: 25, z: 17, rot: 0.2, kind: 'stripe' },
  { x: 37, z: -15, rot: 0.9, kind: 'red' },
];

/** El terebinto grande junto al arroyo, el que da nombre al valle. Marca dónde buscar las piedras. */
export const TEREBINTO: Point & { s: number } = { x: -7.6, z: -21, s: 1.8 };

/**
 * Las cinco piedras lisas (1 S 17:40), en el lecho del arroyo aguas arriba, junto al terebinto
 * y lejos de Goliat. El valor es la distancia al hilo de agua: el lecho seco tiene ±4 m.
 */
export const STONE_SPOTS: Point[] = ([[-31, -2.2], [-27, 1.9], [-23.5, -1.7], [-19, 2.4], [-15, -2.6]] as const).map(([z, side]) => ({ x: mx(z) + side, z }));
