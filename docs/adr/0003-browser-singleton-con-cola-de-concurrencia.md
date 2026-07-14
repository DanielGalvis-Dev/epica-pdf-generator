# ADR-0003: Browser Chromium singleton con cola de concurrencia (`MAX_CONCURRENT_RENDERS = 4`) en vez de un browser por request

## Fecha
2026-07-13 (cambio presente en el árbol de trabajo actual de `backend/src/core/generators/pdf.generator.ts`, aún no commiteado — verificado con `git diff HEAD -- backend/src/core/generators/pdf.generator.ts`). El diseño anterior (un `chromium.launch()` por cada llamada a `generarPdf()`) estuvo vigente desde el commit `6e3a34c` (2026-06-25) hasta este cambio.

## Estado
Aceptado

## Contexto

La implementación original de `generarPdf()` llamaba `await chromium.launch()` dentro de cada request y cerraba ese browser completo (`browser.close()`) en el `finally`. El propio comentario introducido junto con el cambio lo explica sin ambigüedad: *"Lanzar un `chromium.launch()` por request es el cuello de botella crítico bajo carga concurrente (cada launch es un proceso de Chromium completo -> riesgo de OOM)."*

Ese riesgo, antes teórico, se vuelve concreto con dos factores que aparecen en paralelo: (1) la incorporación de un caller externo de mayor volumen potencial — el workflow de n8n descrito en `PLAN-N8N-SPRINT-WORKFLOW.md`, que llamará a `POST /api/sprint/pdf` desde la nube — sumado al uso normal del frontend; y (2) documentos cuyo render puede ser pesado (`sprint`/`detail` con muchos issues, ver ADR-0004 sobre el alto auto-ajustable). Varios requests concurrentes lanzando cada uno un proceso Chromium completo, en un servidor que probablemente corre en una instancia modesta (1-2 vCPU), es una vía directa a quedarse sin memoria.

## Opciones consideradas

1. **Un `chromium.launch()` por request** (diseño original).
   - Pros: aislamiento total entre requests (un crash de un render no puede afectar a otro); código más simple, sin estado compartido a nivel de módulo.
   - Contras: cada request paga el costo completo de arrancar un proceso Chromium (memoria + tiempo de arranque); N requests concurrentes significan N procesos Chromium simultáneos sin ningún límite — riesgo de OOM documentado explícitamente en el comentario del propio código fuente.

2. **Browser singleton** (un único `chromium.launch()` a nivel de módulo, lanzado de forma perezosa la primera vez que se necesita) **+ un `BrowserContext`/`Page` nuevo por request** sobre ese mismo browser **+ una cola de concurrencia manual** (semáforo hecho a mano, `MAX_CONCURRENT_RENDERS = 4`).
   - Pros: un solo proceso Chromium para todo el servidor, memoria acotada y predecible; un `BrowserContext` es sustancialmente más barato que un browser completo; la cola limita cuántos renders compiten a la vez por CPU/memoria sin rechazar requests de más (se encolan en vez de fallar); no agrega ninguna dependencia nueva (el semáforo es un array de callbacks pendientes, código propio).
   - Contras: un solo punto de fallo — si el proceso Chromium singleton crashea, todos los renders que estuvieran en curso en ese momento fallan a la vez (el siguiente request sí puede relanzar el browser gracias al `catch` en `getBrowser()`, que limpia `browserPromise` para permitir reintento); se introduce estado mutable a nivel de módulo (`browserPromise`, `activeRenders`, `waitQueue`) que exige razonar con cuidado sobre condiciones de carrera en un entorno de un solo hilo pero con I/O asíncrono.

3. **Pool de N>1 browsers reutilizables** (ej. round-robin entre varios procesos Chromium).
   - No hay evidencia en el código, los commits ni `CLAUDE.md` de que esta alternativa se haya evaluado. Se documenta aquí como opción no descartada por comparación, sino simplemente no explorada todavía — ver "Notas de seguimiento".

## Decisión

Opción 2. Un browser singleton (`getBrowser()`, con lanzamiento perezoso) más una cola de concurrencia manual (`acquireSlot()`/`releaseSlot()`, `MAX_CONCURRENT_RENDERS = 4`). Cada render adquiere un slot de la cola, abre su propio `BrowserContext` sobre el browser compartido y lo cierra en su `finally` (`context.close()`, nunca `browser.close()` dentro del request — ver también la regla de `await page.pdf()` antes de cerrar, documentada en `CLAUDE.md` y heredada del fix del commit `27de4b6`). El valor `4` se eligió, según el comentario en el código, como *"compromiso entre throughput y uso de memoria en un server que probablemente corre en una instancia modesta (1-2 vCPU)"*, y es trivial de subir o bajar sin tocar el resto de la lógica.

## Consecuencias positivas

- La memoria del servidor queda acotada a un solo proceso Chromium, sin importar cuántos requests de render lleguen simultáneamente.
- Los requests que exceden el límite de concurrencia se encolan en orden FIFO en vez de fallar o de competir sin control por los mismos recursos.
- El apagado ordenado del proceso (`SIGTERM`/`SIGINT`, manejado en `server.ts`) puede cerrar el browser singleton de forma explícita y determinística vía `closeBrowser()`.

## Consecuencias negativas

- `MAX_CONCURRENT_RENDERS = 4` es un número fijo en el código fuente, no calculado dinámicamente según la carga real de CPU/memoria del host — si el hardware cambia (más o menos vCPU), hay que ajustarlo a mano.
- El timeout de render (`RENDER_TIMEOUT_MS = 15_000`) protege contra un render colgado que retenga un slot de la cola para siempre, pero también implica que un documento legítimamente grande que tarde más de 15 segundos en generar su PDF falla con error, sin que el caller pueda pedir un timeout mayor para ese caso puntual (ver la nota correspondiente en `PLAN-N8N-SPRINT-WORKFLOW.md`, que ya asume este límite como un fallo esperado, no configurable desde n8n).
- Toda la aplicación depende de un único proceso Chromium: si ese proceso muere mientras hay renders en curso, todos ellos fallan a la vez (aunque el siguiente request sí pueda relanzar el browser desde cero).

## Notas de seguimiento

Reconsiderar esta decisión si el servidor pasa a correr en una instancia con más vCPU/memoria (subiendo `MAX_CONCURRENT_RENDERS` en consecuencia), o si el volumen de requests concurrentes reales (frontend interno más el workflow de n8n) muestra que la cola genera esperas inaceptables para los usuarios — en ese momento evaluar la opción 3 (pool de varios browsers), que hoy se descarta por falta de necesidad demostrada, no por haberse comparado y perdido frente a otra alternativa.
