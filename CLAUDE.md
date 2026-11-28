# Contexto para asistentes de IA

- Proyecto: juego bíblico 3D por episodios para el navegador del teléfono (PWA). Más adelante, tiendas con Capacitor. Equipo pequeño de ingenieros. Documentación y comentarios en español.
- Stack: Three.js 0.187 + TypeScript (strict) + Vite. Comandos: `npm run dev`, `npm run build` (incluye `tsc`), `npm run preview`.
- Antes de un PR, `npm run build` tiene que pasar. Con `?debug` en la URL aparecen atajos de prueba en `window.__game`.
- Estructura: textos y elenco en `src/content/` (sin lógica, un archivo por nivel), lógica de cada nivel en `src/levels/`, mapas en `src/world/`, personajes en `src/actors/`, armazón del juego en `src/game/`. Un nivel nuevo implementa `Level` (`src/levels/types.ts`) y se suma a `NIVELES`.
- Las decisiones se toman en `docs/decisiones/` (ADR). No asumir como decidido nada que esté en estado "propuesto".
- Texto bíblico: solo traducciones de dominio público o con licencia (ver `docs/investigacion/contenido-y-licencias.md`). No inventar versículos. Las paráfrasis llevan su referencia (libro, capítulo y versículo).
- Contenido narrativo: ceñirse al texto y evitar la interpretación doctrinal.
- Rendimiento: pensar en teléfonos de gama media. Reutilizar materiales (`mat()`), usar `InstancedMesh` para lo repetido y evitar crear objetos en cada frame.
- Nunca poner claves de API dentro de la app. Las llamadas a la IA pasan por el backend.
