import type { Look } from '../actors/person';

/*
 * Episodio 1: David y Goliat (1 Samuel 17).
 *
 * Todo el texto del episodio vive aquí para que el equipo de narrativa y revisión
 * pueda editarlo sin tocar el código del juego.
 *
 * Reglas (ver CLAUDE.md): los diálogos son paráfrasis y llevan su referencia.
 * No se inventan versículos. Las citas textuales solo pueden venir de traducciones
 * de dominio público (Reina-Valera 1909) y deben marcarse como tales.
 */

export interface Line { who: string; text: string; ref?: string }

export const NARRADOR = 'Narrador';

/** Color del retrato de cada personaje en el cuadro de diálogo. */
export const RETRATOS: Record<string, string> = {
  David: '#b8955a', Eliab: '#56688c', Saúl: '#6a3d85', Soldado: '#8a5a3a',
  Goliat: '#b9873b', Filisteo: '#a2402c', [NARRADOR]: '#4a4136',
};

// ---------- Elenco ----------

export const DAVID: Look = { tunic: '#d8c398', hair: '#8c4a2a', staff: true, bag: true };
/** Seis codos y un palmo, casco y cota de bronce, grebas de bronce (1 S 17:4–6). */
export const GOLIAT: Look = { tunic: '#6b3a2a', skin: '#b8805e', hair: '#2a1e18', beard: true, helmet: 'bronze', crest: '#9c2f22', armor: true, greaves: true, spear: 'big', scale: 1.95 };
/** El escudero que va delante de Goliat (1 S 17:7, 41). */
export const ESCUDERO: Look = { tunic: '#8f3a2a', feathers: true, shield: true, skin: '#c99670' };

export type NpcId = 'eliab' | 'saul' | 'sold1' | 'sold2' | 'fil1' | 'fil2' | 'fil3';
export interface CastMember { id: NpcId; name: string; x: number; z: number; yaw: number; look: Look; side: 'israel' | 'filisteo' }

export const ELENCO: CastMember[] = [
  // Eliab era alto (1 S 16:7) y Saúl sobresalía por encima de todos (1 S 9:2).
  // Los soldados están en orden de batalla al pie de su ladera, mirando al valle (1 S 17:20–21).
  { id: 'eliab', name: 'Eliab', x: -15, z: 5, yaw: 1.4, side: 'israel', look: { tunic: '#56688c', helmet: '#8a7a5a', scale: 1.08, spear: true } },
  { id: 'saul', name: 'Saúl', x: -24, z: -1.5, yaw: 1.2, side: 'israel', look: { tunic: '#6a3d85', crown: true, beard: true, cape: '#4a2566', scale: 1.15 } },
  { id: 'sold1', name: 'Soldado', x: -13.5, z: -2, yaw: 1.57, side: 'israel', look: { tunic: '#8a5a3a', helmet: '#7f8088', spear: true } },
  { id: 'sold2', name: 'Soldado', x: -15, z: 11, yaw: 1.5, side: 'israel', look: { tunic: '#7a6a4a', helmet: '#7f8088', beard: true } },
  { id: 'fil1', name: 'Filisteo', x: 22, z: -5, yaw: -1.57, side: 'filisteo', look: { tunic: '#a2402c', feathers: true, spear: true, skin: '#c99670' } },
  { id: 'fil2', name: 'Filisteo', x: 22.5, z: 9, yaw: -1.7, side: 'filisteo', look: { tunic: '#a2402c', feathers: true, skin: '#c99670' } },
  { id: 'fil3', name: 'Filisteo', x: 25, z: 2, yaw: -1.57, side: 'filisteo', look: { tunic: '#8f3a2a', feathers: true, spear: true, skin: '#c99670' } },
];

// ---------- Textos de interfaz ----------

export const MISIONES = {
  comida: 'Lleva la comida a tus hermanos en el campamento',
  saul: 'Habla con el rey Saúl, junto a la tienda morada',
  piedras: 'Junta cinco piedras lisas en el arroyo, junto al gran terebinto',
  gigante: 'Cruza el arroyo y acércate al filisteo',
  fin: 'Episodio completado',
};

export const ZONAS = {
  israel: { nombre: 'Campamento de Israel', sub: 'En el monte, frente a los filisteos' },
  arroyo: { nombre: 'Valle de Ela', sub: 'Ela significa terebinto' },
  filisteo: { nombre: 'Campamento filisteo', sub: 'Entre Soco y Azeca (1 S 17:1)' },
};

export const FINAL = {
  cita: 'La batalla es del Señor, y él no salva con espada ni con lanza.',
  nota: '1 Samuel 17:47 (adaptado). Lee la historia completa en 1 Samuel 17.',
};

// ---------- Diálogos ----------

const N = NARRADOR;
const L = (who: string, text: string, ref?: string): Line => ({ who, text, ref });

export const DIALOGOS = {
  intro: [
    L(N, 'Los filisteos acampan en un monte y el ejército de Israel en el otro. El valle de Ela queda en medio.', '1 S 17:3'),
    L(N, 'Isaí manda a su hijo menor, David, con grano tostado y panes para sus hermanos, que están con el ejército.', '1 S 17:17'),
  ],
  eliab: [
    L('David', '¡Eliab! Nuestro padre te manda grano tostado y panes.', '1 S 17:17'),
    L('Eliab', '¿A qué viniste? ¿Con quién dejaste las pocas ovejas en el desierto? Viniste a ver la batalla.', '1 S 17:28'),
    L('David', '¿Qué hice ahora? Solo estaba preguntando.', '1 S 17:29'),
  ],
  eliabDespues: [L('Eliab', '¿Todavía sigues aquí, David?')],
  saulAntes: [L('Saúl', 'Muchacho, ¿no deberías buscar a tus hermanos?')],
  saul: [
    L('David', 'Que nadie se desanime por ese filisteo. Yo iré a pelear contra él.', '1 S 17:32'),
    L('Saúl', 'No puedes. Eres un muchacho, y él es un guerrero desde su juventud.', '1 S 17:33'),
    L('David', 'Cuando cuidaba las ovejas venían un león o un oso. Yo los perseguía y rescataba la oveja.', '1 S 17:34–35'),
    L('David', 'El Señor, que me libró del león y del oso, me librará de este filisteo.', '1 S 17:37'),
    L('Saúl', 'Ve, y que el Señor esté contigo.', '1 S 17:37'),
    L(N, 'Saúl le pone su armadura, pero David no puede andar con ella. Se la quita, toma su cayado y su honda y baja al arroyo.', '1 S 17:38–40'),
  ],
  saulDespues: [L('Saúl', 'Ve, y que el Señor esté contigo.', '1 S 17:37')],
  soldado1: [
    L('Soldado', 'Ese gigante sale cada mañana y cada tarde a desafiarnos. Ya van cuarenta días.', '1 S 17:16'),
    L('Soldado', 'Dicen que el rey dará grandes riquezas al que lo venza, y también a su hija.', '1 S 17:25'),
  ],
  soldado1Final: [L('Soldado', '¡El gigante cayó! ¡Vamos tras ellos!', '1 S 17:52')],
  soldado2: [
    L('Soldado', 'Se llama Goliat, de Gat. Mide seis codos y un palmo: casi tres metros.', '1 S 17:4'),
    L('Soldado', 'Su cota de malla pesa cinco mil siclos de bronce, unos 57 kilos. Y lleva grebas de bronce en las piernas.', '1 S 17:5–6'),
  ],
  filisteo: [L('Filisteo', 'Nuestro campeón nunca perdió. ¿Qué haces aquí, pastor?')],
  piedrasCompletas: [L(N, 'David guarda las cinco piedras en su bolsa de pastor y, con la honda en la mano, se acerca al filisteo.', '1 S 17:40')],
  goliatAntes: [L('Goliat', '¡Elijan a un hombre que baje a pelear conmigo!', '1 S 17:8'), L('David', '(Todavía no estoy listo.)')],
  goliat: [
    L('Goliat', '¿Acaso soy un perro, para que vengas contra mí con palos?', '1 S 17:43'),
    L('David', 'Tú vienes con espada, lanza y escudo. Yo vengo en el nombre del Señor de los ejércitos.', '1 S 17:45'),
    L('David', 'Así toda la tierra sabrá que hay Dios en Israel.', '1 S 17:46'),
  ],
  victoria: [
    L(N, 'La piedra se clava en la frente del filisteo, y cae con el rostro en tierra.', '1 S 17:49'),
    L(N, 'Cuando los filisteos ven caer a su campeón, huyen. Israel grita de alegría.', '1 S 17:51–52'),
  ],
} satisfies Record<string, Line[]>;

export const AVISOS = {
  comidaEntregada: 'Comida entregada',
  buscarPiedras: 'Baja al arroyo, junto al gran terebinto, y busca piedras lisas entre los cantos',
  piedra: (n: number) => `Piedra lisa ${n} de 5`,
  acerca: 'El filisteo viene hacia David, con su escudero delante',
  corre: 'David corre hacia el filisteo',
  apuntar: '<b>Arrastra</b> para apuntar a la frente y <b>suelta</b> para lanzar',
  coraza: 'Rebotó en la coraza de bronce. ¡Apunta a la frente!',
  alto: 'Muy alto. Apunta un poco más abajo',
  bajo: 'Muy bajo. Apunta un poco más arriba',
  derecha: 'Muy a la derecha',
  izquierda: 'Muy a la izquierda',
  largo: 'Pasó de largo',
  recarga: 'David vuelve a cargar la honda',
  quedan: (n: number) => ` · Quedan ${n}`,
};
