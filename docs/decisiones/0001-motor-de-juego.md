# ADR-0001: Motor de juego

- **Estado:** propuesto
- **Fecha:** 2026-11-21
- **Participantes:** (por completar)

## Contexto

Juego móvil 2D/2.5D por episodios, hecho por un equipo pequeño de ingenieros sin presupuesto, con uso intensivo de asistentes de IA.

## Opciones

1. **Godot 4**: gratis (MIT), apps livianas, escenas en texto, servidores MCP para Claude Code. Los SDK de anuncios dependen de la comunidad.
2. **Unity 6**: el estándar en el móvil, con monetización madura y muchos assets. Licencia de pago al crecer y apps más pesadas.
3. **Unreal 5**: excesivo para 2D en el móvil.

## Decisión

Propuesta: **Godot 4**, salvo que el equipo elija 3D o monetización con anuncios como eje central.

## Consecuencias

- Hay que aprender GDScript (rápido para quien sabe Python).
- Si después se necesitan anuncios, habrá que integrar plugins o código nativo.
- Ver [tecnologias.md](../investigacion/tecnologias.md).
