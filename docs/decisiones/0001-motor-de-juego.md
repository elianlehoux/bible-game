# ADR-0001: Motor de juego y plataforma

- **Estado:** propuesto (falta la revisión del equipo en el PR)
- **Fecha:** 2026-11-28 (reemplaza la propuesta del 2026-11-21, que era Godot 4)
- **Participantes:** (por completar)

## Contexto

Juego bíblico 3D low poly por episodios, hecho por un equipo pequeño de ingenieros que usa mucho la IA para programar. Queremos que cualquiera lo pueda jugar con un link (grupos de WhatsApp, iglesias, escuelas) y llegar a las tiendas más adelante.

## Opciones

1. **Web primero: Three.js + TypeScript + Vite.** Se juega con un link y se instala como app (PWA). Las actualizaciones llegan al instante y el código es el del prototipo. Para iOS hay que empaquetarlo con Capacitor y rinde menos que una app nativa.
2. **Godot 4.** Es gratis y exporta a web, iOS y Android, pero el build web es pesado en el teléfono y hay que aprender GDScript.
3. **Unity 6.** Tiene el ecosistema móvil más maduro, pero el build web es pesado y la licencia es paga al crecer.
4. **Babylon.js.** Es como la opción 1 pero trae más incluido (física, interfaz, inspector). Sigue siendo una alternativa si Three.js se queda corto.

## Decisión

Propuesta: **opción 1, web primero.**

- Motor: Three.js 0.187 con TypeScript, compilado con Vite.
- Distribución: PWA publicada en GitHub Pages con cada merge a `main`.
- Tiendas: más adelante, el mismo build empaquetado con Capacitor.

## Consecuencias

- El juego está en `src/` y los textos de cada episodio en `src/content/`.
- En iPhone, la pantalla completa en Safari es limitada. Instalado desde "Agregar a inicio" se ve completo.
- Los personajes actuales están hechos con formas simples. Para el arte final hay que cargar modelos glTF, que Three.js soporta, generados con el pipeline de [estilo-visual.md](../investigacion/estilo-visual.md).
- Si el rendimiento en teléfonos baratos no alcanza, revisamos esta decisión antes de producir más episodios.
