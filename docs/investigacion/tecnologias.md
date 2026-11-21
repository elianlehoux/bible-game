# Tecnologías

## Motor

| | Godot 4 | Unity 6 | Unreal 5 |
|---|---|---|---|
| Costo | Gratis, licencia MIT | Gratis hasta cierto nivel de ingresos; Pro es caro por persona | Gratis; 5 % de regalías al pasar cierto umbral de ingresos |
| Tamaño de la app (proyecto vacío) | ~45–70 MB | ~180–250 MB | 150 MB o más |
| 2D | Excelente | Muy bueno | Flojo |
| Anuncios y compras integradas | Plugins de la comunidad | Muy maduro | Regular |
| Formato de escenas | Texto (`.tscn`), fácil de leer en un diff | YAML, con merges complicados | Binario |
| Asistentes de IA | Varios servidores MCP para Claude Code | Hay MCP / IA integrada | Limitado |
| Lenguaje | GDScript (parecido a Python) o C# | C# | C++ / Blueprints |

**Recomendación: Godot 4.** Para un equipo pequeño que hace un juego 2D/2.5D no tiene costo, genera apps livianas (importa para las descargas en el móvil) y guarda todo en texto, así que se trabaja bien con git y con agentes de IA.
**Cuándo elegir Unity:** si la monetización con anuncios es central o si se apuesta por 3D. Antes de decidir, revisar los términos de licencia actuales de Unity.

## Backend (por fases)

| Fase | Herramienta | Para qué |
|---|---|---|
| MVP | Ninguno | Partidas guardadas en el teléfono; funciona sin conexión |
| v2 | **Supabase** (Postgres, auth, edge functions) | Cuentas, partidas en la nube, rankings, retos y **proxy para la IA** (las claves de API nunca van dentro de la app) |
| v3 | **Nakama** (open source, específico para juegos) | Solo si llega el multijugador en tiempo real (matchmaking, salas) |

Firebase también sirve, pero Supabase es SQL, open source y se puede alojar en servidores propios.

## Herramientas del equipo

- Repo: GitHub, con PRs y revisión. **Git LFS** para arte y audio cuando empiece la producción.
- CI: GitHub Actions para exportar builds de Android/iOS (hay acciones para Godot).
- Pruebas: Godot GUT o GdUnit4.
- Distribución de pruebas: TestFlight (iOS) e Internal Testing (Google Play).

## Fuentes

- [Unity vs Godot vs Unreal 2026 – Oceanview Games](https://oceanviewgames.co.uk/blog/posts/unity-vs-godot-vs-unreal-2026)
- [Godot vs Unity 2026 – Tech Insider](https://tech-insider.org/godot-vs-unity-2026/)
- [Mobile game engines – AppRadar](https://appradar.com/blog/mobile-game-engines-development-platforms)
- [Godot multiplayer backends 2026 – Supercraft](https://crux.supercraft.host/blog/godot-multiplayer-backend-services-what-indie-devs-use-2026/)
- [Supabase as a game backend – DEV](https://dev.to/adilbouchnita/supabase-as-a-game-backend-a-practical-guide-p2h)
- [SpacetimeDB vs PlayFab vs Nakama 2026 – Tech Insider](https://tech-insider.org/spacetimedb-vs-playfab-vs-nakama-2026/)
