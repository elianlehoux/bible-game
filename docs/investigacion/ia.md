# Qué se puede hacer con IA

## 1. Para desarrollar (lo más rentable)

| Uso | Herramientas | Nota |
|---|---|---|
| Programación | Claude Code + un **servidor MCP de Godot** (godot-ai, Beckett, coding-solo/godot-mcp) | La IA puede crear escenas, editar scripts e incluso probar el juego |
| Arte 2D / pixel art | Pixellab, Scenario, Leonardo | Revisar la licencia comercial de cada herramienta |
| Modelos 3D | Meshy, Tripo, Rodin | Solo si se va a 2.5D o 3D |
| Voces | TTS (ElevenLabs y similares) | Para doblar diálogos en varios idiomas |
| Contenido | LLM para borradores de diálogos, preguntas de quiz y traducciones | **Siempre con revisión humana** (ver riesgos) |

## 2. Dentro del juego

**Función estrella propuesta: "Habla con el personaje".** El jugador le pregunta a Moisés, a David o a Ester sobre su historia.

Cómo hacerlo bien:

1. **Respuestas basadas en el texto:** el modelo solo responde a partir de los pasajes del episodio y de notas revisadas (RAG). No inventa hechos.
2. **Guardarraíles:** personaje fijo, temas permitidos y rechazo amable de lo que esté fuera de tema. Si es para niños, filtros más estrictos.
3. **Citas:** cada respuesta muestra el versículo en el que se basa.
4. **Respaldo:** diálogos guionados si no hay conexión o se acaba el presupuesto.
5. **Costos:** límite de mensajes por día, caché de las preguntas frecuentes y modelo barato por defecto.

### ¿En el dispositivo o en la nube?

| | En el dispositivo | En la nube |
|---|---|---|
| Latencia | < 200 ms | 1–5 s |
| Costo por usuario | ~0 | Por token |
| Calidad | Baja (los modelos pequeños todavía rinden poco en el móvil) | Alta |
| Sin conexión | Sí | No |

**Recomendación:** nube a través de un proxy en Supabase para la v1 de esta función; medir el costo por usuario; evaluar modelos en el dispositivo más adelante.

## Riesgos

- **Precisión doctrinal:** una alucinación sobre la Biblia es un problema serio de reputación. Mitigación: respuestas basadas en el texto, revisión humana del contenido fijo y un botón para reportar respuestas.
- **Neutralidad entre denominaciones:** hay que definir el criterio (por ejemplo, ceñirse a la narrativa del texto y evitar la interpretación doctrinal).
- **Privacidad de menores:** si el público es infantil, el chat libre con IA complica cumplir COPPA y GDPR-K. En ese caso conviene usar respuestas con opciones predefinidas.
- **Arte generado por IA:** parte del público lo rechaza. Conviene usarlo para prototipos o con un estilo definido y retocado por personas.

## Fuentes

- [Arquitectura móvil para personajes con LLM – Arm](https://developer.arm.com/community/arm-community-blogs/b/mobile-graphics-and-gaming-blog/posts/first-contact-a-mobile-architecture-for-llm_2d00_powered-game-characters)
- [Snapdragon Game AI SDK – Qualcomm](https://www.qualcomm.com/developer/blog/2026/03/snapdragon-game-ai-sdk-launch-on-device-ai-in-gaming)
- [Small language model companions – AWS](https://aws.amazon.com/blogs/gametech/revolutionizing-games-with-small-language-model-ai-companions)
- [LLM local vs cloud para NPCs](https://www.abratabia.com/llm-npcs/local-vs-cloud-llm.php)
- [Godot AI (MCP)](https://pypi.org/project/godot-ai/1.2.6/), [Beckett](https://forum.godotengine.org/t/beckett-zero-sidecar-mcp-server-for-godot-4-2-the-ai-sees-and-optionally-playtests-your-game/141177), [coding-solo/godot-mcp](https://docsearch.algolia.com/mcp/docs/repo/coding-solo/godot-mcp)
- [Herramientas de IA para assets – Wayline](https://www.wayline.io/blog/best-ai-game-asset-creation-tools-workflow-indie-devs), [Techsy](https://techsy.io/en/blog/best-ai-game-asset-generators)
