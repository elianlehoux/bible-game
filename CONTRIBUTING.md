# Cómo colaborar

1. **Ideas y discusiones** → issues (plantilla "Idea" o "Decisión").
2. **Decisiones importantes** (motor, backend, público, monetización) → un ADR en `docs/decisiones/`, a partir de la [plantilla](docs/decisiones/0000-plantilla.md). Se aceptan con un PR aprobado por al menos 2 personas.
3. **Cambios** → una rama `tipo/descripcion` (`feat/`, `fix/`, `docs/`) y un PR contra `main`. Nadie hace push directo a `main`. El CI corre `npm run build` (incluye la revisión de tipos) y tiene que pasar. Al hacer merge, el juego se publica solo.
4. **Commits** cortos, en presente: `feat: diálogo de David`.
5. **IA:** se puede usar para todo. Quien abre el PR es responsable de revisar lo que generó la IA. Lo que generen la IA y otras herramientas debe tener una licencia que permita uso comercial.
6. **Texto bíblico:** solo de fuentes permitidas (ver [contenido-y-licencias.md](docs/investigacion/contenido-y-licencias.md)).
