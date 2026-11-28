# bible-game

Juego bíblico 3D que corre en el navegador del teléfono y se puede instalar como app. Lo hace un grupo pequeño de ingenieros, usando IA para programar y para producir contenido.

> **Estado:** primer episodio jugable, *La honda de David* (1 Samuel 17).

## Jugar y desarrollar

Requiere Node 22.

```bash
npm install
npm run dev       # abre http://localhost:5173 (y en el teléfono, la IP que muestra, en la misma wifi)
npm run build     # revisa los tipos y genera dist/
npm run preview   # sirve el build, con modo sin conexión
```

Agrega `?debug` a la URL para tener atajos de prueba en `window.__game`.

**Publicación:** cada merge a `main` publica el juego en GitHub Pages (`.github/workflows/web.yml`). Hay que activarlo una sola vez en *Settings → Pages → Source: GitHub Actions*.

## Estructura

| Carpeta | Qué hay |
|---|---|
| `src/content/` | Textos, elenco y misiones de cada episodio. Lo editan narrativa y revisión bíblica |
| `src/world/` | Terreno, cielo, carpas, vegetación y ubicaciones |
| `src/actors/` | Personajes y ovejas |
| `src/game/` | Lógica del episodio, honda, diálogos, interfaz y controles |
| `public/` | Manifest, service worker (modo sin conexión) e íconos |
| `prototipos/` | Prototipos anteriores (retro 2D y 3D), como referencia |
| `docs/` | Investigación y decisiones |

## Decisiones (propuestas)

| Tema | Propuesta | Detalle |
|---|---|---|
| Tipo de juego | Aventura para un jugador, por episodios | [tipo-de-juego.md](docs/investigacion/tipo-de-juego.md) |
| Plataforma y motor | **Web primero:** Three.js + TypeScript + Vite, como PWA; tiendas después con Capacitor | [ADR-0001](docs/decisiones/0001-motor-de-juego.md) |
| Estilo | 3D low poly con luz de atardecer | [estilo-visual.md](docs/investigacion/estilo-visual.md) |
| Backend | Ninguno por ahora → Supabase para cuentas, rankings y proxy de IA | [tecnologias.md](docs/investigacion/tecnologias.md) |
| IA | Para producir contenido (con revisión) y para hablar con los personajes | [ia.md](docs/investigacion/ia.md) |
| Texto bíblico | Traducciones de dominio público (RV1909, KJV, WEB) | [contenido-y-licencias.md](docs/investigacion/contenido-y-licencias.md) |

## Más documentos

- [Ideas de juego](docs/ideas.md)
- [Preguntas abiertas y hoja de ruta](docs/hoja-de-ruta.md)
- [Cómo colaborar](CONTRIBUTING.md)
