import type { Look } from '../actors/person';
import { L, NARRADOR as N, type Line } from './comun';

// Nivel 4: el valle de Ela (1 Samuel 17:20–58).

/** Seis codos y un palmo, casco y cota de bronce, grebas de bronce (1 S 17:4–6). */
export const GOLIAT: Look = { tunic: '#6b3a2a', skin: '#b8805e', hair: '#2a1e18', beard: true, helmet: 'bronze', crest: '#9c2f22', armor: true, greaves: true, spear: 'big', scale: 1.95 };
/** El escudero que va delante de Goliat (1 S 17:7, 41). */
export const ESCUDERO: Look = { tunic: '#8f3a2a', feathers: true, shield: true, skin: '#c99670' };

export type NpcId = 'guarda' | 'eliab' | 'abinadab' | 'sama' | 'saul' | 'sold1' | 'sold2' | 'fil1' | 'fil2' | 'fil3';
export interface CastMember { id: NpcId; name: string; x: number; z: number; yaw: number; look: Look; side: 'israel' | 'filisteo' }

export const ELENCO: CastMember[] = [
  // El guarda del bagaje, a la entrada del campamento (1 S 17:22).
  { id: 'guarda', name: 'Guarda', x: -21.5, z: -21, yaw: 0.6, side: 'israel', look: { tunic: '#7a7350', beard: true, hair: '#5a4a36' } },
  // Los tres hermanos mayores fueron a la guerra con Saúl (1 S 17:13). Eliab era alto (1 S 16:7).
  // Los soldados están en orden de batalla al pie de su ladera, mirando al valle (1 S 17:20–21).
  { id: 'eliab', name: 'Eliab', x: -15, z: 5, yaw: 1.4, side: 'israel', look: { tunic: '#56688c', helmet: '#8a7a5a', scale: 1.08, spear: true } },
  { id: 'abinadab', name: 'Abinadab', x: -15.5, z: 7.5, yaw: 1.5, side: 'israel', look: { tunic: '#5a7a68', helmet: '#8a7a5a', spear: true } },
  { id: 'sama', name: 'Sama', x: -16.5, z: 3, yaw: 1.3, side: 'israel', look: { tunic: '#7a5a6a', helmet: '#8a7a5a', beard: true } },
  // Saúl sobresalía por encima de todos (1 S 9:2).
  { id: 'saul', name: 'Saúl', x: -24, z: -1.5, yaw: 1.2, side: 'israel', look: { tunic: '#6a3d85', crown: true, beard: true, cape: '#4a2566', scale: 1.15 } },
  { id: 'sold1', name: 'Soldado', x: -13.5, z: -2, yaw: 1.57, side: 'israel', look: { tunic: '#8a5a3a', helmet: '#7f8088', spear: true } },
  { id: 'sold2', name: 'Soldado', x: -15, z: 11, yaw: 1.5, side: 'israel', look: { tunic: '#7a6a4a', helmet: '#7f8088', beard: true } },
  { id: 'fil1', name: 'Filisteo', x: 22, z: -5, yaw: -1.57, side: 'filisteo', look: { tunic: '#a2402c', feathers: true, spear: true, skin: '#c99670' } },
  { id: 'fil2', name: 'Filisteo', x: 22.5, z: 9, yaw: -1.7, side: 'filisteo', look: { tunic: '#a2402c', feathers: true, skin: '#c99670' } },
  { id: 'fil3', name: 'Filisteo', x: 25, z: 2, yaw: -1.57, side: 'filisteo', look: { tunic: '#8f3a2a', feathers: true, spear: true, skin: '#c99670' } },
];

export const MISIONES = {
  bagaje: 'Deja la carga con el guarda del bagaje',
  hermanos: 'Corre a la línea de batalla y saluda a tus hermanos',
  preguntar: 'Pregunta a los soldados qué pasa con el gigante',
  otro: 'Pregúntale a otro soldado',
  saul: 'Saúl te manda llamar: ve a la tienda morada',
  armadura: 'Prueba a caminar con la armadura de Saúl',
  quitar: 'No puedes andar así: quítate la armadura',
  piedras: 'Junta cinco piedras lisas en el arroyo, junto al gran terebinto',
  gigante: 'Cruza el arroyo y acércate al filisteo',
  fin: 'Episodio completado',
};

export const ZONAS = {
  israel: { nombre: 'Campamento de Israel', sub: 'En el monte, frente a los filisteos' },
  arroyo: { nombre: 'Valle de Ela', sub: 'Ela significa terebinto' },
  filisteo: { nombre: 'Campamento filisteo', sub: 'Entre Soco y Azeca (1 S 17:1)' },
};

export const DIALOGOS = {
  llegada: [
    L(N, 'David llega al campamento cuando el ejército sale a formar y lanza el grito de guerra.', '1 S 17:20'),
    L(N, 'Israel y los filisteos se ponen en orden de batalla, un ejército frente al otro.', '1 S 17:21'),
  ],
  guarda: [
    L('David', 'Traigo víveres de parte de Isaí, mi padre. ¿Puedo dejarlos aquí?'),
    L('Guarda', 'Déjalos conmigo, yo cuido el bagaje.'),
    L(N, 'David deja la carga en manos del guarda y corre hacia el ejército.', '1 S 17:22'),
  ],
  guardaDespues: [L('Guarda', 'Tu carga está segura conmigo.')],
  saludo: [
    L('David', '¡Eliab! Nuestro padre quiere saber cómo están.', '1 S 17:18, 22'),
    L('Eliab', 'Estamos bien, David. Pero no es buen momento...'),
  ],
  desafio: [
    L('Goliat', '¡Elijan a un hombre que baje a pelear conmigo! Si me vence, seremos sus siervos. Si yo lo venzo, ustedes serán los nuestros.', '1 S 17:8–9, 23'),
    L(N, 'Al ver al filisteo, los hombres de Israel retroceden con mucho miedo.', '1 S 17:24'),
  ],
  eliabAntes: [L('Eliab', '¿David? Deja primero tu carga con el guarda del bagaje.')],
  eliabDespues: [L('Eliab', '¿Todavía sigues aquí, David?')],
  soldadoAntes: [L('Soldado', '¡A formar! El ejército sale a la batalla.', '1 S 17:20')],
  saulAntes: [L('Saúl', 'Muchacho, ¿no deberías estar con tus hermanos?')],
  hermano: [L('Abinadab', 'Ese gigante sale cada día. Nadie se atreve a bajar.', '1 S 17:16')],
  hermanoSama: [L('Sama', 'Quédate atrás, hermanito. Esto no es como cuidar ovejas.')],
  soldado1: [
    L('Soldado', '¿Vieron a ese hombre? Sale a desafiar a Israel. Ya van cuarenta días, mañana y tarde.', '1 S 17:16, 25'),
    L('David', '¿Qué le darán al que venza a este filisteo? ¿Quién es él para desafiar a los escuadrones del Dios vivo?', '1 S 17:26'),
    L('Soldado', 'El rey le dará grandes riquezas, le dará a su hija y su familia no pagará tributo.', '1 S 17:25, 27'),
  ],
  eliabEnojo: [
    L('Eliab', '¿A qué viniste? ¿Con quién dejaste las pocas ovejas en el desierto? Yo conozco tu soberbia: viniste a ver la batalla.', '1 S 17:28'),
    L('David', '¿Qué hice ahora? ¿No es solo una pregunta?', '1 S 17:29'),
  ],
  soldado2: [
    L('David', '¿Es verdad lo que dicen del que venza al filisteo?', '1 S 17:30'),
    L('Soldado', 'Sí, lo mismo. Se llama Goliat, de Gat. Mide seis codos y un palmo: casi tres metros.', '1 S 17:4, 30'),
    L('Soldado', 'Su cota de malla pesa cinco mil siclos de bronce, unos 57 kilos.', '1 S 17:5'),
  ],
  llamado: [L(N, 'Algunos oyen las palabras de David y se las cuentan a Saúl, que lo manda llamar.', '1 S 17:31')],
  soldadoDespues: [L('Soldado', 'El rey te busca, muchacho.')],
  saul: [
    L('David', 'Que nadie se desanime por ese filisteo. Yo iré a pelear contra él.', '1 S 17:32'),
    L('Saúl', 'No puedes. Eres un muchacho, y él es un guerrero desde su juventud.', '1 S 17:33'),
    L('David', 'Cuando cuidaba las ovejas de mi padre venía un león o un oso. Yo lo perseguía y rescataba la oveja.', '1 S 17:34–35'),
    L('David', 'El Señor, que me libró del león y del oso, me librará de este filisteo.', '1 S 17:37'),
    L('Saúl', 'Ve, y que el Señor esté contigo.', '1 S 17:37'),
    L(N, 'Saúl viste a David con su ropa, le pone un casco de bronce y lo cubre con una coraza.', '1 S 17:38'),
  ],
  saulDespues: [L('Saúl', 'Ve, y que el Señor esté contigo.', '1 S 17:37')],
  pesada: [L('David', 'No puedo andar con esto, porque no estoy acostumbrado.', '1 S 17:39')],
  sinArmadura: [L(N, 'David se quita la armadura, toma su cayado y su honda y baja al arroyo.', '1 S 17:39–40')],
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
    L(N, 'Cuando los filisteos ven caer a su campeón, huyen. Israel grita de alegría y los persigue.', '1 S 17:51–52'),
  ],
  abner: [
    L(N, 'Abner, el jefe del ejército, lleva a David ante Saúl.', '1 S 17:55–57'),
    L('Saúl', '¿De quién eres hijo, muchacho?', '1 S 17:58'),
    L('David', 'Soy hijo de tu siervo Isaí, de Belén.', '1 S 17:58'),
  ],
  soldadoFinal: [L('Soldado', '¡El gigante cayó! ¡Vamos tras ellos!', '1 S 17:52')],
} satisfies Record<string, Line[]>;

export const AVISOS = {
  pesada: 'Con la armadura casi no puedes caminar',
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
