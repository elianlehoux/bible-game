import { L, NARRADOR as N, type Line } from './comun';

// Nivel 3: el camino de Belén al valle de Ela (1 Samuel 17:20). Los obstáculos son de juego:
// el texto solo dice que David salió de madrugada y llegó cuando el ejército salía a formar.

/** Une la salida de Belén con el camino. */
export const ENTRADA = {
  texto: 'David se levantó de madrugada, dejó las ovejas al cuidado de un guarda, tomó la carga y se fue, como Isaí le había mandado.',
  ref: '1 Samuel 17:20',
};

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
  // Antes de cada paso difícil (son del juego, no del texto bíblico): se leen con el juego en pausa.
  derrumbe: [L(N, 'Más adelante, por la ladera bajan piedras sueltas, siempre por las mismas canaletas.'), L(N, 'Cuando veas polvo arriba, espera a que pase la piedra y cruza enseguida.')],
  arroyo: [L(N, 'El arroyo viene crecido. Hay que cruzarlo pisando las piedras.'), L(N, 'Las piedras más oscuras se hunden un rato con la corriente: espera a que vuelvan a salir.')],
  cornisa: [L(N, 'El sendero sigue por una cornisa angosta sobre el barranco. Camina pegado a la pared de roca.')],
} satisfies Record<string, Line[]>;

export const AVISOS = {
  descanso: 'Descanso: si te caes, vuelves aquí',
  roca: 'Te golpeó una piedra. Vuelves al último descanso',
  agua: 'La corriente casi se lleva la carga. Vuelves al último descanso',
  barranco: 'Resbalaste. Vuelves al último descanso',
  tarde: 'Se hizo tarde. Inténtalo otra vez desde el último descanso',
};
