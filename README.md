# bible-game

Juego móvil (iOS / Android) basado en historias de la Biblia, hecho por un grupo pequeño de ingenieros y usando IA tanto para desarrollar como dentro del juego.

> **Estado:** Fase 0, investigación y definición de la idea. Todavía no hay código.

## Propuesta inicial (para discutir)

| Tema | Propuesta | Detalle |
|---|---|---|
| Tipo de juego | Aventura narrativa **para un jugador, por episodios/misiones** (un episodio = una historia bíblica), con funciones sociales asíncronas más adelante | [tipo-de-juego.md](docs/investigacion/tipo-de-juego.md) |
| Motor | **Godot 4** (gratis, liviano, todo en texto → bueno para git e IA) | [tecnologias.md](docs/investigacion/tecnologias.md) |
| Backend | Ninguno en el MVP → **Supabase** para cuentas/rankings/proxy de IA → Nakama solo si llega el multijugador en tiempo real | [tecnologias.md](docs/investigacion/tecnologias.md) |
| IA | Para producir contenido (con revisión humana) **y** como función en el juego: "habla con un personaje", con respuestas basadas en el texto bíblico | [ia.md](docs/investigacion/ia.md) |
| Texto bíblico | Traducciones de dominio público (RV1909, KJV, WEB) | [contenido-y-licencias.md](docs/investigacion/contenido-y-licencias.md) |

Nada de esto está decidido. Las decisiones se registran como ADR en [`docs/decisiones/`](docs/decisiones/).

## Documentos

- [Ideas de juego](docs/ideas.md): conceptos para votar
- [Preguntas abiertas y hoja de ruta](docs/hoja-de-ruta.md)
- [Cómo colaborar](CONTRIBUTING.md)
- [Investigación](docs/investigacion/)
