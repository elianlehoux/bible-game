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

**Actualización (2026-11-28):** la propuesta pasó a ser **web primero con Three.js + TypeScript + Vite**, publicado como PWA y empaquetado con Capacitor para las tiendas. Godot queda como alternativa. Ver [ADR-0001](../decisiones/0001-motor-de-juego.md).

## Backend (por fases)

| Fase | Herramienta | Para qué |
|---|---|---|
| MVP | Ninguno | Partidas guardadas en el teléfono; funciona sin conexión |
| v2 | **Supabase** (Postgres, auth, edge functions) | Cuentas, partidas en la nube, rankings, retos y **proxy para la IA** (las claves de API nunca van dentro de la app) |
| v3 | **Nakama** (open source, específico para juegos) | Solo si llega el multijugador en tiempo real (matchmaking, salas) |

Firebase también sirve, pero Supabase es SQL, open source y se puede alojar en servidores propios.

## Herramientas del equipo

- Repo: GitHub, con PRs y revisión. **Git LFS** para arte y audio cuando empiece la producción.
- CI: GitHub Actions compila cada PR y publica `main` en GitHub Pages (`.github/workflows/web.yml`).
- Pruebas: `tsc` estricto en cada build; pruebas end-to-end con Playwright cuando haga falta.
- Distribución de pruebas: TestFlight (iOS) e Internal Testing (Google Play).

## Fuentes

- [Unity vs Godot vs Unreal 2026 – Oceanview Games](https://oceanviewgames.co.uk/blog/posts/unity-vs-godot-vs-unreal-2026)
- [Godot vs Unity 2026 – Tech Insider](https://tech-insider.org/godot-vs-unity-2026/)
- [Mobile game engines – AppRadar](https://appradar.com/blog/mobile-game-engines-development-platforms)
- [Godot multiplayer backends 2026 – Supercraft](https://crux.supercraft.host/blog/godot-multiplayer-backend-services-what-indie-devs-use-2026/)
- [Supabase as a game backend – DEV](https://dev.to/adilbouchnita/supabase-as-a-game-backend-a-practical-guide-p2h)
- [SpacetimeDB vs PlayFab vs Nakama 2026 – Tech Insider](https://tech-insider.org/spacetimedb-vs-playfab-vs-nakama-2026/)
