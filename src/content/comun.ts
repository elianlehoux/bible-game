import type { Look } from '../actors/person';

/*
 * Episodio 1: David y Goliat (1 Samuel 16–17), en cuatro niveles.
 *
 * Los textos de cada nivel viven en src/content/nivelN.ts para que el equipo de narrativa y revisión
 * pueda editarlos sin tocar el código del juego.
 *
 * Reglas (ver CLAUDE.md): los diálogos son paráfrasis y llevan su referencia.
 * No se inventan versículos. Las citas textuales solo pueden venir de traducciones
 * de dominio público (Reina-Valera 1909) y deben marcarse como tales.
 * Las líneas sin referencia son de juego (indicaciones), no del texto bíblico.
 */

export interface Line { who: string; text: string; ref?: string }

export const NARRADOR = 'Narrador';
export const L = (who: string, text: string, ref?: string): Line => ({ who, text, ref });

/** Color del retrato de cada personaje en el cuadro de diálogo. */
export const RETRATOS: Record<string, string> = {
  David: '#b8955a', Isaí: '#7a6248', Pastor: '#8a7a4a', Eliab: '#56688c', Abinadab: '#5a7a68', Sama: '#7a5a6a',
  Saúl: '#6a3d85', Abner: '#4a5a7a', Soldado: '#8a5a3a', Guarda: '#6a6a4a', Goliat: '#b9873b', Filisteo: '#a2402c',
  [NARRADOR]: '#4a4136',
};

/** David, el menor de los hijos de Isaí: pastor, con cayado y bolsa (1 S 16:11; 17:40). */
export const DAVID: Look = { tunic: '#d8c398', hair: '#8c4a2a', staff: true, bag: true };
/** Con la carga de víveres para sus hermanos (1 S 17:17–18). */
export const DAVID_CARGA: Look = { ...DAVID, sack: true };
/** Con la armadura de Saúl: casco de bronce y coraza (1 S 17:38). */
export const DAVID_ARMADURA: Look = { ...DAVID, staff: false, helmet: 'bronze', armor: true, tunic: '#6a3d85' };

export const ISAI: Look = { tunic: '#8a7458', hair: '#d8d2c4', beard: true, staff: true, skin: '#b8805e' };
export const PASTOR: Look = { tunic: '#9a8a62', hair: '#4a3626', beard: true, staff: true };

/** Título y texto de la pantalla final. */
export const FINAL = {
  cita: 'La batalla es del Señor, y él no salva con espada ni con lanza.',
  nota: '1 Samuel 17:47 (adaptado). Lee la historia completa en 1 Samuel 17.',
};
