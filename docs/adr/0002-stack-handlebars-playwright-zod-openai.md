# ADR-0002: Stack Handlebars + Playwright + Zod + OpenAI structured output

## Fecha
2026-06-23 (commit `7b23a33`, decisión de inception del proyecto — primer commit del repositorio).

## Estado
Aceptado

## Contexto

El sistema necesita, en un solo flujo: (a) tomar un Markdown escrito por humanos con estructura variable entre autores/meses y convertirlo en datos estructurados fieles al diseño oficial de Polaria; (b) permitir que el usuario revise y edite ese JSON antes de generar el documento final; (c) renderizar un HTML con diseño pixel-perfect (colores de marca, iconos Tabler, tipografías de Google Fonts, donuts con `conic-gradient`) a un PDF entregable.

`CLAUDE.md` instruye explícitamente: *"No introducir nuevas dependencias (librerías de PDF, plantillas, validación, etc.) sin justificar por qué Handlebars/Playwright/Zod/OpenAI no alcanzan."* Es decir, esta decisión ya está tomada y en vigor en todo el proyecto; este ADR documenta el razonamiento inverso (por qué esta combinación sí alcanza), tal como pide esa misma instrucción.

**Limitación de este ADR:** no hay en el repositorio (issues, discusiones, commits previos al primer commit) evidencia de una comparación formal y contemporánea entre alternativas antes de escribir la primera línea de código — el primer commit (`7b23a33`) ya llega con Handlebars, Playwright, Zod y OpenAI integrados de punta a punta. Este documento reconstruye el razonamiento a partir del resultado (el propio código y el diseño de los schemas) y de la instrucción vigente en `CLAUDE.md`, no de un registro de decisión contemporáneo a la elección. Se declara como limitación en vez de inventar un proceso de evaluación que no está documentado en ningún lado.

## Opciones consideradas

**Para el motor de render a PDF:**

1. **`pdfkit` (o librería equivalente de generación directa de PDF, dibujando primitivas: texto, líneas, rectángulos).**
   - Pros: no depende de un browser headless; PDF más liviano y rápido de generar; sin el overhead de memoria de Chromium.
   - Contras: un layout con la complejidad real de las plantillas (donuts de estado, grids de tarjetas por miembro, tipografías variables, iconos, colores dinámicos por paleta) se vuelve código imperativo de coordenadas x/y en vez de CSS declarativo; cualquier ajuste de diseño visual obliga a tocar TypeScript en vez de HTML/CSS, mucho más lento de iterar junto con quien diseña.

2. **Playwright (Chromium headless) + HTML/CSS como fuente del diseño (Handlebars para inyectar los datos).**
   - Pros: el diseño se escribe en HTML/CSS estándar — Google Fonts, Tabler Icons, `conic-gradient` para donuts, flexbox/grid para las tarjetas —, iteración de diseño rápida y familiar para cualquiera que sepa CSS; `page.pdf()` produce un PDF fiel al render real de un browser, no una aproximación.
   - Contras: dependencia pesada (binario de Chromium de varios cientos de MB por plataforma, descargado en `postinstall: playwright install chromium`); cada render consume un proceso/contexto de browser, lo que exige gestionar concurrencia con cuidado (ver ADR-0003).

**Para la validación de datos:**

3. **JSON Schema escrito a mano, o librerías como `io-ts`/`class-validator`.**
   - Pros: JSON Schema es el formato más portable — útil si un consumidor externo no-TypeScript necesitara el mismo contrato (como terminó ocurriendo con el workflow de n8n).
   - Contras: JSON Schema a mano duplica el tipo TypeScript (se escribe la forma del dato dos veces, con riesgo real de que diverjan); `io-ts`/`class-validator` agregan una curva de aprendizaje adicional y no tienen un helper directo hacia el `response_format` de OpenAI.

4. **Zod.**
   - Pros: el schema y el tipo TypeScript son la misma fuente (`z.infer<typeof Schema>`); `openai/helpers/zod` expone `zodResponseFormat(schema, name)`, que fuerza a la respuesta de OpenAI a cumplir el schema exacto sin parseo manual frágil de texto libre; `safeParse()` produce errores estructurados (`.flatten()`) que viajan tal cual en las respuestas `400 VALIDATION_ERROR` de la API, sin transformación adicional.
   - Contras: acopla el proyecto a un enfoque "schema-first" de TypeScript; portar el contrato a un runtime no-TypeScript (el propio workflow de n8n) exige una transcripción manual del schema — limitación ya documentada explícitamente en `docs/planning/PLAN-N8N-SPRINT-WORKFLOW.md` para el Structured Output Parser del agente.

**Para la extracción de datos desde Markdown:**

5. **Parseo manual de Markdown (regex/AST) sin IA.**
   - Pros: determinístico, sin costo de API ni latencia de red.
   - Contras: el Markdown de origen no tiene una estructura fija entre documentos (varía la redacción mes a mes / sprint a sprint); extraer campos con rangos de caracteres exactos, resúmenes ejecutivos e inferencias de riesgo transversal no es viable con reglas fijas de parseo.

6. **OpenAI (`gpt-4o-mini`) con `response_format: zodResponseFormat` (structured output).**
   - Pros: garantiza que la respuesta cumple el schema Zod exacto sin post-procesar texto libre; modelo de bajo costo (`PRECIO_GPT4OMINI` en `constants.ts`: 0.15 USD/millón tokens de entrada, 0.60 USD/millón de salida) adecuado para el volumen real (documentos mensuales/por sprint, no un flujo de alto volumen); permite instrucciones de dominio (`systemPrompt`) específicas por tipo de documento.
   - Contras: dependencia de un servicio externo (disponibilidad, costo variable según uso, no 100% determinístico en el contenido aunque el *shape* del schema esté garantizado) — mitigado con `temperature: 0.2` y por el propio flujo del producto, que deja al usuario revisar/editar el JSON antes de generar el PDF final.

## Decisión

Handlebars (compilación y cacheo de plantillas en memoria) + Playwright/Chromium para el render final a PDF, Zod como contrato único de datos, y OpenAI (`gpt-4o-mini`, structured output vía `zodResponseFormat`) para la extracción desde Markdown. Elegido desde el primer commit del proyecto y confirmado como decisión vigente por la instrucción explícita en `CLAUDE.md` de no reemplazar ninguna pieza de este stack sin justificar por qué no alcanza.

## Consecuencias positivas

- El diseño visual vive en HTML/CSS estándar, iterable por cualquiera que sepa CSS, no solo por quien toca TypeScript.
- El mismo schema Zod sirve simultáneamente de contrato para la IA (`zodResponseFormat`), de validación de request (`safeParse`) y de tipo TypeScript (`z.infer`) — una sola definición, no tres sincronizadas a mano dentro del backend.
- Los errores de validación y de extracción llegan siempre en la misma forma estándar (`{ success:false, code, message, details }`), consumible sin ambigüedad tanto por el frontend como por un workflow de automatización externo.

## Consecuencias negativas

- Chromium headless es la dependencia más pesada del proyecto (binario grande vía `postinstall`, y riesgo de saturar memoria bajo concurrencia si no se controla — ver ADR-0003 para cómo se mitiga).
- El costo y la disponibilidad del único paso de IA (extracción) quedan atados a un proveedor externo (OpenAI); una caída o cambio de precio de OpenAI afecta directamente ese endpoint sin alternativa interna.
- Portar el contrato Zod a un consumidor no-TypeScript (el workflow de n8n) exige mantenerlo sincronizado a mano — ya documentado como riesgo concreto en `docs/planning/PLAN-N8N-SPRINT-WORKFLOW.md` ("no hay forma de compartir código entre el Zod de TypeScript y n8n sin agregar una dependencia nueva al backend").

## Notas de seguimiento

- Si el volumen de renders concurrentes crece más allá de lo que un solo proceso Chromium tolera, reconsiderar (ver ADR-0003) un pool de browsers o un servicio de render dedicado.
- Si se necesita compartir el schema Zod con un runtime no-TypeScript de forma automática (evitando la transcripción manual hacia n8n), evaluar en ese momento herramientas de generación de JSON Schema desde Zod (ej. `zod-to-json-schema`), respetando la regla de `CLAUDE.md` de justificar cualquier dependencia nueva antes de agregarla.
