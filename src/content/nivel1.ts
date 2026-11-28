import { L, NARRADOR as N, type Line } from './comun';

// Nivel 1: el pastor de Belén. David cuenta este episodio a Saúl en 1 Samuel 17:34–37.

export const MISIONES = {
  juntar: 'Junta las ovejas en el redil: acércate y te siguen',
  perseguir: 'Persigue al león y sácale el cordero',
  pelea: 'El león se vuelve contra ti: golpéalo cuando salte',
  volver: 'Lleva el cordero de vuelta al redil',
  fin: 'El rebaño está a salvo',
};

export const DIALOGOS = {
  intro: [
    L(N, 'Isaí, de Belén, tiene ocho hijos. David, el menor, cuida las ovejas de su padre.', '1 S 16:11; 17:12–15'),
    L(N, 'Se hace tarde y las ovejas andan sueltas por el campo. Júntalas en el redil de piedra.'),
  ],
  leon: [L(N, 'De pronto, un león sale de los matorrales y se lleva un cordero del rebaño.', '1 S 17:34')],
  suelta: [
    L(N, 'David lo persigue, lo hiere y le saca el cordero de la boca.', '1 S 17:35'),
    L(N, 'Pero el león se vuelve contra él.', '1 S 17:35'),
  ],
  vencido: [
    L(N, 'David lo agarra de la quijada, lo hiere y lo mata.', '1 S 17:35'),
    L('David', 'El Señor me libró de las garras del león.', '1 S 17:37'),
  ],
  fin: [L(N, 'El cordero vuelve con el rebaño. Ninguna oveja se perdió.')],
} satisfies Record<string, Line[]>;

export const AVISOS = {
  sigue: 'La oveja te sigue. Llévala al redil',
  entrada: 'La entrada del redil está del lado oeste',
  golpea: 'Pulsa Golpear justo cuando salte',
  golpe: (n: number) => `¡Le diste! (${n} de 3)`,
  derribo: 'El león te derribó. Golpea justo cuando salta',
  escapa: 'Alcánzalo: cuando estés cerca, golpéalo',
};
