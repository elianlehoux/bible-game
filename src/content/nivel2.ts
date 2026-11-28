import { L, NARRADOR as N, type Line } from './comun';

// Nivel 2: el encargo de Isaí (1 Samuel 17:12–20).

export const MISIONES = {
  isai: 'Tu padre Isaí viene a buscarte',
  tareas: 'Deja las ovejas con el pastor y recoge la carga en el patio de tu casa',
  partir: 'Toma el camino del oeste hacia el valle de Ela',
};

export const ITEMS = [
  { id: 'grano', nombre: 'Grano tostado', aviso: 'Un efa de grano tostado' },
  { id: 'panes', nombre: 'Diez panes', aviso: 'Diez panes para tus hermanos' },
  { id: 'quesos', nombre: 'Diez quesos', aviso: 'Diez quesos para el jefe de mil' },
] as const;

export const DIALOGOS = {
  intro: [L(N, 'Es temprano. David está con el rebaño, junto al redil.')],
  isai: [
    L(N, 'Los tres hijos mayores de Isaí, Eliab, Abinadab y Sama, se fueron a la guerra con Saúl.', '1 S 17:13'),
    L('Isaí', 'David, toma para tus hermanos este efa de grano tostado y estos diez panes, y llévalos pronto al campamento.', '1 S 17:17'),
    L('Isaí', 'Y estos diez quesos llévalos al jefe de mil. Mira cómo están tus hermanos y tráeme una señal de ellos.', '1 S 17:18'),
    L('Isaí', 'Están con Saúl y con todo Israel en el valle de Ela, peleando contra los filisteos.', '1 S 17:19'),
    L('Isaí', 'La carga está en el patio de casa. Deja las ovejas con alguien que las cuide.'),
  ],
  isaiDespues: [L('Isaí', 'Llévalo pronto al campamento, hijo.', '1 S 17:17')],
  pastor: [
    L('David', 'Mi padre me manda al campamento. ¿Puedes cuidar las ovejas?'),
    L('Pastor', 'Ve tranquilo, David. Yo cuido el rebaño.'),
    L(N, 'David deja las ovejas al cuidado de un guarda.', '1 S 17:20'),
  ],
  pastorDespues: [L('Pastor', 'Las ovejas están bien. Ve con cuidado por el camino.')],
  partida: [L(N, 'David sale de madrugada con la carga, como Isaí le mandó, rumbo al valle de Ela.', '1 S 17:20')],
} satisfies Record<string, Line[]>;

export const AVISOS = {
  falta: (que: string) => `Todavía falta: ${que}`,
  pastor: 'dejar las ovejas con el pastor',
  carga: 'recoger la carga en el patio',
};
