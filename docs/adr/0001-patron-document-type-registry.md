# ADR-0001: Patrón "document type" con registro (`DocumentConfig` + `registry.ts`) en vez de rutas ad-hoc por documento

## Fecha
2026-06-25 (commit `6e3a34c`, "feat: add epica and sprint document configurations and templates" — introduce `backend/src/documents/registry.ts` y generaliza `document.routes.ts` a 4 endpoints parametrizados por `:docType`).

## Estado
Aceptado

## Contexto

El proyecto arrancó dos días antes (commit `7b23a33`, 2026-06-23) soportando un único documento ("epica"), con `extractor.ts`, `renderer.ts` y `types.ts` acoplados directamente a ese caso: el schema, el prompt de IA y la plantilla HTML de épica vivían mezclados con la lógica genérica de extracción/render.

En el commit `6e3a34c` había que sumar un segundo tipo de documento ("sprint"), con su propio schema Zod, su propio `systemPrompt`, sus propias plantillas y sus propios datos de ejemplo. Con la estructura anterior, eso significaba duplicar (o bifurcar con `if`s) los 4 flujos que ya existían para épica: extraer, preview, pdf y sample-preview. Cualquier tercer documento futuro repetiría el mismo problema.

## Opciones consideradas

1. **Rutas ad-hoc por documento** (ej. `/api/epica/pdf` y `/api/sprint/pdf` definidas como handlers separados en el router, cada uno importando a mano su propio schema/prompt/plantilla).
   - Pros: cero abstracción; cada ruta es explícita y se puede leer de forma aislada sin entender un "registro" intermedio.
   - Contras: N documentos implican 4×N handlers casi idénticos (extraer/preview/pdf/sample-preview) que inevitablemente divergen con el tiempo (ej. uno valida distinto, otro se olvida de un chequeo); agregar un documento nuevo obliga a tocar el router; alto riesgo de que la validación o el manejo de errores queden inconsistentes entre documentos.

2. **Patrón "document type" con registro** (`DocumentConfig<T>` + `registry.ts`): un único set de 4 rutas genéricas parametrizadas por `:docType`, que resuelven `config = getDocumentConfig(docType)` en tiempo de ejecución.
   - Pros: agregar un documento nuevo no toca las rutas (solo se crea la carpeta `documents/<tipo>/` y se registra en `registry.ts`); un solo contrato (`types.ts`) define qué debe proveer cada documento (`schema`, `systemPrompt`, `componerDatos`, `templates`, `defaultTemplate`); el error `404 NOT_FOUND` para un `docType` inexistente es uniforme en los 4 endpoints.
   - Contras: agrega una capa de indirección (`getDocumentConfig`) que hay que entender antes de ver qué pasa con un `docType` concreto; todo documento debe encajar en el mismo shape `DocumentConfig<T>`, lo cual es menos flexible si un documento futuro necesitara un flujo radicalmente distinto (por ejemplo, sin extracción por IA, o con múltiples schemas de entrada).

3. **Frameworks de plugin más sofisticados** (auto-discovery de carpetas por filesystem, convención de nombres, etc.) — no hay evidencia en el código, los commits ni `CLAUDE.md` de que esta alternativa se haya evaluado seriamente. Se documenta aquí como limitación de este ADR (no se reconstruye un debate que no ocurrió), no como opción descartada tras comparación real.

## Decisión

Opción 2: patrón "document type" con registro. `document.routes.ts` expone 4 endpoints genéricos (`GET /:docType/sample-preview`, `POST /:docType/extraer`, `POST /:docType/preview`, `POST /:docType/pdf`) que resuelven la configuración vía `getDocumentConfig(docType)` de `registry.ts`. Cada documento (`epica`, `sprint`) es un módulo autocontenido en `backend/src/documents/<tipo>/` que exporta un `DocumentConfig<T>`.

## Consecuencias positivas

- Sumar un tercer tipo de documento no requiere tocar rutas, validación ni lógica de render — solo la carpeta del documento nuevo y dos líneas en `registry.ts` (`documentRegistry` y `documentSamples`).
- El contrato único (`DocumentConfig<T>`) hace explícito y verificable qué debe proveer cualquier documento nuevo, en vez de dejarlo a la convención tácita de "copiar cómo lo hizo el anterior".
- Los 4 endpoints se comportan igual para cualquier `docType`, lo que simplifica el consumo: el frontend y el workflow de n8n usan exactamente la misma forma de request/response sin importar si es `epica` o `sprint`.

## Consecuencias negativas

- Todo documento debe encajar en el mismo contrato (`schema` Zod + `systemPrompt` + `componerDatos` + `templates`/`defaultTemplate`); un documento que no use extracción por IA, o que necesite una forma de render distinta, forzaría a estirar `DocumentConfig<T>` con campos opcionales o a salirse del patrón como caso especial.
- Los errores de configuración de plantilla se resuelven en runtime con fallback silencioso (`templateKey` inválido cae al `defaultTemplate` sin avisar, ver `resolveTemplate` en `pdf.generator.ts`) en vez de fallar en tiempo de compilación — un `plantilla` mal escrito desde el frontend o desde n8n no se detecta hasta que el resultado visual es el inesperado (este riesgo ya está identificado en `docs/planning/PLAN-N8N-SPRINT-WORKFLOW.md`, que agrega una validación explícita de `plantilla` en el workflow de n8n precisamente por este motivo).

## Notas de seguimiento

Si aparece un tipo de documento que no encaje en el contrato actual (por ejemplo, sin extracción por IA, o con múltiples schemas de entrada combinados), reconsiderar si `DocumentConfig<T>` necesita campos opcionales adicionales o si amerita introducir una variante de configuración distinta en `types.ts`.
