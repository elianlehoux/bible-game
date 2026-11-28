import { L, NARRADOR as N, type Line } from './comun';

// Nivel 3: el camino de Belén al valle de Ela (1 Samuel 17:20). Los obstáculos son de juego:
// el texto solo dice que David salió de madrugada y llegó cuando el ejército salía a formar.

export const MISION = 'Llega al valle de Ela antes de que el ejército salga a formar';
export const RELOJ = 'El ejército sale en ';
/** Segundos para llegar. */
export const TIEMPO = 150;

export const ZONAS = {
  inicio: { nombre: 'Camino a Ela', sub: 'Bajando de los montes de Judá' },
  derrumbe: { nombre: 'La ladera', sub: 'Caen piedras' },
  arroyo: { nombre: 'El arroyo crecido' },
  cornisa: { nombre: 'La cornisa', sub: 'Sobre el barranco' },
  fin: { nombre: 'Valle de Ela' },
};

export const DIALOGOS = {
  intro: [
    L(N, 'De Belén al valle de Ela hay un buen trecho, bajando de los montes de Judá hacia la Sefelá.'),
    L(N, 'Isaí le dijo que fuera pronto. Hay que llegar antes de que el ejército salga a la batalla.', '1 S 17:17, 20'),
  ],
  llegada: [L(N, 'Desde la loma, David ve el campamento de Israel en el valle de Ela.', '1 S 17:20')],
} satisfies Record<string, Line[]>;

export const AVISOS = {
  derrumbe: 'Mira el polvo arriba de la ladera y pasa entre una piedra y otra',
  arroyo: 'Cruza pisando las piedras. Algunas se hunden con la corriente',
  cornisa: 'La cornisa es angosta: no te acerques al borde',
  descanso: 'Descanso: si te caes, vuelves aquí',
  roca: 'Te golpeó una piedra. Vuelves al último descanso',
  agua: 'La corriente casi se lleva la carga. Vuelves al último descanso',
  barranco: 'Resbalaste. Vuelves al último descanso',
  tarde: 'Se hizo tarde. Inténtalo otra vez desde el último descanso',
};
