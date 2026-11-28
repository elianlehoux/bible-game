# Estilo visual

Hay dos prototipos para comparar, y los dos cuentan la misma historia (1 Samuel 17):

| | [Retro 2D](../../prototipos/valle-de-ela/index.html) | [3D low poly](../../prototipos/honda-3d/index.html) |
|---|---|---|
| Look | Pixel art en 5 variantes (8 bits, 16 bits, 1 bit…) | Formas geométricas simples, luz de atardecer, sombras y niebla |
| Mecánica principal | Movimiento por casillas y diálogos | Joystick, cámara libre y honda que se apunta arrastrando, con física |
| Costo de arte | Bajo | Medio (los modelos se pueden generar con IA) |
| Atractivo | Nicho, nostálgico | Más amplio y más "juego moderno" |

## Cómo se produciría el 3D

1. **Motor:** Godot 4 (renderer Mobile o Compatibility) o Unity URP, con un shader toon o de sombreado plano. Hay packs de shaders para Godot 4 que funcionan en el móvil, pero algunos solo corren en Forward+, así que hay que probarlos en un teléfono real.
2. **Personajes:** dibujo de concepto → modelo 3D con IA (Meshy o Tripo) → retoque en Blender → esqueleto automático (Meshy, Tripo o Mixamo) → animaciones de Mixamo, que solo funcionan con humanoides.
3. **Escenarios:** piezas modulares low poly (rocas, árboles, carpas) reutilizadas entre episodios.
4. **Dirección de arte:** paleta de la región (piedra caliza, olivos y terebintos, anémonas rojas), luz cálida y niebla para dar profundidad.

Costos de referencia: Tripo cuesta unos 12 USD al mes y Meshy unos 16 USD al mes por 200 créditos. Hay que verificar los precios actuales.

## Fuentes

- [Godot 4 shader packs (itch.io)](https://itch.io/game-assets/tag-low-poly/tag-shaders), [Godot forum: toon shaders](https://forum.godotengine.org/t/looking-for-opensource-toon-shaders/124376)
- [Meshy: auto-rigging](https://www.meshy.ai/features/ai-auto-rigging), [Tripo: auto-rigging para indies](https://www.tripo3d.ai/blog/free-ai-auto-rigging-indie-games)
- [Comparativa de rigging con IA 2026 – StraySpark](https://www.strayspark.studio/blog/ai-auto-rigging-showdown-2026-tripo-meshy-cascadeur-mixamo)
- [Mejores generadores de assets con IA 2026 – 3D AI Studio](https://www.3daistudio.com/blog/best-ai-game-asset-generators-2026)
