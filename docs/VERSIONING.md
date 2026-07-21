# Política de versionado semántico (SemVer)

**Prioridad: Baja** según la guía interna, pero de bajo costo de adoptar — este proyecto ya tiene un campo `version` en `backend/package.json` (`1.0.0`), así que se documenta una política mínima en vez de marcarlo N/A.

## Qué significa cada número en este proyecto

| Componente | Cuándo incrementar | Ejemplo concreto en este proyecto |
|---|---|---|
| **MAJOR** (`X.0.0`) | Cambio que rompe compatibilidad para quien consume la API (hoy: el frontend propio y, a futuro, el workflow de n8n). | Cambiar el shape de `EpicaSchema`/`SprintSchema` de forma incompatible (renombrar/eliminar un campo requerido), cambiar el contrato de respuesta de un endpoint (ej. que `/pdf` deje de devolver binario), o cambiar el formato de `ErrorResponseBody`. |
| **MINOR** (`0.X.0`) | Funcionalidad nueva, compatible hacia atrás. | Agregar un tipo de documento nuevo (ver patrón `documents/<tipo>/` en `CLAUDE.md`), agregar una plantilla nueva a un tipo existente, agregar un campo opcional a un schema. |
| **PATCH** (`0.0.X`) | Corrección de bug o mejora que no cambia el contrato. | El fix ya mergeado de `await page.pdf()` antes de `browser.close()` (commit `27de4b6`), ajustes de estilo en una plantilla `.html`. |

## Dónde vive la versión

- **`backend/package.json`**, campo `version` — única fuente de verdad hoy. Actualmente `1.0.0`.
- No hay git tags de release todavía (`git tag` no devuelve nada al día de escribir esto) — si se adopta esta política hacia adelante, cada release relevante debería tener su tag `vX.Y.Z`.
- `CHANGELOG.md` (recién creado, ver el archivo en la raíz) — cada versión debería tener su sección con la fecha real.

## Nota honesta sobre el `1.0.0` actual

La guía interna marca como error común "usar la versión 1.0.0 para el primer commit del proyecto" porque `1.0.0` implica un contrato público estable. Este proyecto ya está en `1.0.0` en `package.json` sin que exista ese contrato formal todavía (no hay consumidores externos aparte del propio frontend, y el endpoint público para n8n está todavía en fase de diseño, ver `docs/planning/PLAN-N8N-SPRINT-WORKFLOW.md`). No se cambia el número como parte de esta documentación — es una decisión del equipo, no algo para resolver unilateralmente acá — pero queda señalado: a partir de que n8n empiece a depender de `/api/sprint/pdf` como contrato real, cualquier cambio que lo rompa debería tratarse como MAJOR en serio, no solo de nombre.

## Proceso de release (cuando se decida empezar a taggear)

1. Confirmar que `npm run build` compila sin errores (único gate real disponible hoy, ver `docs/TESTING.md`).
2. Mover los cambios de `[Unreleased]` en `CHANGELOG.md` a una nueva sección con la versión y fecha.
3. Actualizar `version` en `backend/package.json`.
4. Commit: `chore: release vX.Y.Z`.
5. Tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"` y `git push --tags`.

No hay automatización de este proceso (no se usa `standard-version`/`semantic-release`) — es manual, y no se propone agregar la dependencia sin discutirlo primero, según pide `CLAUDE.md`.
