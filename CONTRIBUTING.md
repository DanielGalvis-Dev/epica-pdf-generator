# Contribuir a Polaria PDF Generator

Este documento define cómo se trabaja en este repositorio: convención de ramas, de commits, proceso de Pull Request, Definition of Done y estándares de código. Está escrito para el tamaño real del equipo hoy (Polaria tiene un equipo técnico chico — Luis, Mauricio, Daniel — y hasta la fecha este repositorio en particular tiene un único committer, Daniel Galvis) y para las herramientas que realmente existen en el proyecto (sin CI, sin linter, sin suite de tests — ver `CLAUDE.md`). Si el equipo crece o se agregan herramientas nuevas, actualizar este documento en el mismo PR que las incorpora.

## Convención de ramas

`main` es la única rama activa del repositorio (`git branch -a` no muestra otras ramas locales ni remotas más que `origin/main`). El historial actual (4 commits) se hizo commiteando directo sobre `main` porque hasta ahora hubo un solo desarrollador tocando el código. Esta es la convención a seguir de acá en adelante, especialmente en cuanto haya más de una persona trabajando en paralelo o un cambio no trivial:

Formato: `tipo/descripcion-en-kebab-case`

| Tipo | Cuándo usarlo | Ejemplo | Se crea desde |
|---|---|---|---|
| `feat/` | Nueva funcionalidad (nuevo tipo de documento, nueva plantilla, nuevo endpoint) | `feat/plantilla-resumen-cierre` | `main` (última versión) |
| `fix/` | Corrección de un bug que no es urgente en producción | `fix/pdf-alto-recortado` | `main` |
| `refactor/` | Reordenar/limpiar código sin cambiar comportamiento | `refactor/extraer-componer-datos-sprint` | `main` |
| `docs/` | Solo documentación (`CLAUDE.md`, `README.md`, este archivo, etc.) | `docs/actualizar-claude-md-api-key` | `main` |
| `chore/` | Mantenimiento (dependencias, configuración, tooling) | `chore/actualizar-playwright` | `main` |
| `hotfix/` | Corrección urgente sobre algo ya desplegado/en uso | `hotfix/browser-close-antes-de-pdf` | `main` |

Regla práctica dado el tamaño del equipo: para un cambio de una sola línea o un typo, commitear directo a `main` es aceptable (así se hizo históricamente). Para cualquier cambio que toque un schema (`EpicaSchema`/`SprintSchema`), una plantilla existente, o que vaya a tardar más de una sesión de trabajo, usar una rama con el formato de arriba — facilita revertir o revisar antes de mergear.

## Convención de commits

El proyecto ya usa [Conventional Commits](https://www.conventionalcommits.org/) de forma informal — lo confirma el propio historial (`git log --oneline`):

```
27de4b6 fix(pdf): esperar resolución de page.pdf() antes de cerrar el browser
c52334f feat: add sample preview endpoint and improve PDF generation configuration
6e3a34c feat: add epica and sprint document configurations and templates
7b23a33 feat: Implement PDF generation feature with markdown extraction and HTML rendering
```

Este documento formaliza esa práctica. Formato: `tipo(scope opcional): descripción en imperativo`.

| Prefijo | Cuándo usar | Usado en este repo hoy |
|---|---|---|
| `feat:` | Nueva funcionalidad | Sí |
| `fix:` | Corrección de bug | Sí |
| `refactor:` | Cambio de código sin nueva funcionalidad ni fix | Todavía no — mismo formato cuando aplique |
| `docs:` | Solo documentación | Todavía no — mismo formato cuando aplique |
| `chore:` | Mantenimiento (dependencias, config) | Todavía no — mismo formato cuando aplique |
| `test:` | Agregar o modificar tests | Todavía no (no hay suite de tests en el proyecto) |
| `style:` | Solo formato, sin cambio de lógica | Todavía no — mismo formato cuando aplique |
| `hotfix:` | Corrección urgente sobre algo ya en uso | Todavía no — mismo formato cuando aplique |

Ejemplos reales, tomados literalmente del historial de este repositorio:

- `feat: Implement PDF generation feature with markdown extraction and HTML rendering`
- `feat: add epica and sprint document configurations and templates`
- `fix(pdf): esperar resolución de page.pdf() antes de cerrar el browser`

El scope entre paréntesis (como `(pdf)`) es opcional pero recomendado cuando el cambio es específico de un módulo (`pdf`, `sprint`, `epica`, `frontend`), tal como ya se hizo en `fix(pdf): ...`.

## Proceso de Pull Request

Pensado para el tamaño real del equipo (hoy, un desarrollador activo en este repo; potencialmente 2-3 si Luis o Mauricio empiezan a tocar código):

1. Crear la rama desde `main` con el formato de la sección anterior (o trabajar directo en `main` solo si el cambio es trivial, ver regla práctica arriba).
2. Implementar el cambio en commits atómicos, siguiendo la convención de commits.
3. Antes de abrir el PR (o antes de mergear, si se trabajó directo en `main`):
   - Correr `npm run build` dentro de `backend/` y confirmar que compila sin errores (ver Definition of Done — es el único chequeo automatizado que existe hoy).
   - Probar manualmente el flujo afectado con `npm run dev` (usar un puerto distinto a 3001 si ya hay un servidor de desarrollo corriendo, según indica `CLAUDE.md`).
   - Si el cambio afecta el resultado visual del PDF (plantilla nueva o modificada), adjuntar una captura del PDF o preview generado.
4. Abrir el PR con: qué cambia y por qué, cómo probarlo paso a paso, capturas si el cambio es visual (plantilla/PDF/frontend).
5. Aprobaciones necesarias: **1**, de cualquier otra persona del equipo que esté disponible para revisar. Si se está trabajando en solitario (el caso más frecuente hasta hoy), se permite auto-mergear siempre que se haya cumplido la Definition of Done completa — no hay excusa para saltarse `npm run build` ni la prueba manual solo por no tener revisor.
6. Responder todos los comentarios de la revisión antes de mergear.
7. Mergear solo cuando: la Definition of Done se cumple y (si hubo revisor) su aprobación quedó registrada en el PR. No hay gate de CI que bloquee el merge porque hoy no existe ningún pipeline de CI/CD en este repositorio (ver `CLAUDE.md`, sección "Pendiente de documentar") — el chequeo lo corre manualmente quien mergea.
8. Quién puede mergear: quien abrió el PR, una vez cumplidos los puntos anteriores.
9. Borrar la rama después de mergear (`git branch -d` / `git push origin --delete`), salvo que se haya trabajado directo en `main`.

## Definition of Done

Todo cambio debe cumplir esto antes de considerarse terminado. Cada punto es verificable con un comando o una acción concreta — nada de "está bien probado" o "el código es legible":

- [ ] `npm run build` (dentro de `backend/`) compila sin errores — es el único comando de verificación automatizado que existe hoy en el proyecto. **No hay** `npm run lint` ni `npm run test` configurados en `backend/package.json`; no marcar esos pasos como cumplidos porque no existen.
- [ ] El flujo afectado se probó manualmente corriendo `npm run dev` (en un puerto distinto a 3001 si el usuario ya tiene uno corriendo) y generando al menos una vista previa o PDF real con el cambio aplicado.
- [ ] Si el cambio toca un schema Zod (`EpicaSchema`/`SprintSchema`), una plantilla existente o el comportamiento de `pdf.generator.ts`, se revisó que no rompe los documentos que ya funcionan (`epica`, `sprint` con sus tres plantillas).
- [ ] Si el cambio afecta comportamiento visible (nuevo endpoint, nuevo tipo de documento, nueva plantilla, cambio de schema), se actualizó `CHANGELOG.md` en el mismo PR.
- [ ] Si el cambio afecta arquitectura o convenciones descritas en `CLAUDE.md` (patrón "document type", reglas de `pdf.generator.ts`, variables de entorno), se actualizó `CLAUDE.md` en el mismo PR.

## Estándares de código

Este repositorio ya documenta sus convenciones en `CLAUDE.md` — este archivo no las duplica, las referencia:

- **Idioma**: identificadores, comentarios y mensajes de error en español; los nombres reflejan el dominio (`componerDatos`, `asignarPaleta`, `HORAS_FIJAS`). No traducir nombres de dominio al inglés.
- **Patrón "document type"**: cualquier documento nuevo o cambio de schema debe seguir el patrón ya establecido en `backend/src/documents/<tipo>/` (`config.ts` + `sample-data.ts` + `template*.html`, registrado en `documents/registry.ts`). No crear rutas o lógica de render ad-hoc fuera de ese patrón — las rutas de `backend/src/api/document.routes.ts` son genéricas y no deberían necesitar cambios para un documento nuevo.
- **Plantillas Handlebars sin helpers custom**: cualquier formateo o derivación de datos se hace en `componerDatos()`, nunca en el `.html`.
- **Errores de API**: `res.status(...).json({ error: string })`, con un `console.error` previo que incluya el `docType` — seguir ese mismo formato en rutas nuevas.
- **Sin dependencias nuevas sin justificar**: no agregar librerías de PDF, plantillas, validación, etc. sin explicar por qué Handlebars/Playwright/Zod/OpenAI no alcanzan.
- **Sin linter/formatter configurado**: no asumir que existe `eslint`, `prettier` u otra herramienta — no hay ningún script de lint en `backend/package.json` hoy. Si se agrega uno en el futuro, actualizar esta sección y la Definition of Done.
- **`pdf.generator.ts`**: si se toca esta función, `await page.pdf(...)` debe resolverse antes de `browser.close()` (que va en el `finally`). Cerrar el browser antes de que esa promesa resuelva ya causó fallos intermitentes en este proyecto — no revertir ese orden.

## Cómo reportar bugs

Hoy no hay plantilla de issue configurada en GitHub (no existe carpeta `.github/ISSUE_TEMPLATE`). Al reportar un bug — como issue de GitHub o directo al equipo — incluir:

- Qué tipo de documento y plantilla estabas usando (`epica`, o `sprint` con `detail`/`resumen-inicio`/`resumen`).
- Qué endpoint falló (`sample-preview`, `extraer`, `preview` o `pdf`) y el mensaje de error exacto devuelto (`{ error: "..." }`).
- Pasos para reproducirlo: qué `.md` subiste (o adjuntarlo si no tiene datos sensibles), qué tocaste en el JSON antes de generar la vista previa/PDF.
- Comportamiento esperado vs. lo que pasó realmente (por ejemplo: "el PDF se cortaba en la página 2" en vez de "el PDF estaba mal").
- Si aplica, el JSON completo que se mandó a `preview`/`pdf` — suele ser el dato más útil para reproducir bugs de renderizado.

## Cómo proponer mejoras

Tampoco hay una plantilla formal para esto. Para proponer una funcionalidad nueva (un tipo de documento, una plantilla nueva, un campo nuevo en un schema):

- Describir el caso de uso real que la motiva (qué documento de Polaria no se puede generar hoy, o qué genera mal).
- Si implica cambiar un schema Zod existente (`EpicaSchema`/`SprintSchema`), señalarlo explícitamente — son el contrato entre la IA, el frontend y el render, y `CLAUDE.md` pide avisar antes de romper compatibilidad.
- Si implica un cambio de arquitectura (nuevo patrón de routing, otro motor de plantillas/PDF, etc.), explicar la decisión y el porqué antes de implementar, tal como pide `CLAUDE.md`.
- Proponerlo antes de escribir el código, aunque sea de forma breve (issue, mensaje al equipo, o comentario en el PR si ya se empezó) — dado que el equipo es chico, alcanza con que quede por escrito en algún lado antes de mergear.
