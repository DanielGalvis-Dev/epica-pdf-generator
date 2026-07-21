# ADR-0005: Autenticación por API key propia (header `X-API-Key`) para la exposición pública del backend, en vez de auth a nivel de túnel/infraestructura

## Fecha
2026-07-13 (implementado en el árbol de trabajo actual: `apiKeyAuth` en `backend/src/api/document.routes.ts`, aplicado en `backend/src/server.ts` vía `app.use("/api", apiKeyAuth)` — verificado con `git diff HEAD`). Decisión confirmada previamente en `docs/planning/PLAN-N8N-SPRINT-WORKFLOW.md`, sección "Decisiones confirmadas (Fase 0)", punto 1.

## Estado
Aceptado

## Contexto

Hasta ahora el backend corre únicamente en `localhost:3001`, consumido por el frontend estático servido por el mismo proceso Express — sin necesidad de autenticación, porque no hay superficie de ataque más allá de la propia máquina del usuario. El plan de integrar un workflow de n8n que corre en la nube (`docs/planning/PLAN-N8N-SPRINT-WORKFLOW.md`) y que necesita llamar a `POST /api/sprint/pdf` obliga a exponer el backend con una URL pública (deploy real, o un túnel tipo Cloudflare Tunnel/ngrok mientras se prueba).

Un backend público sin ninguna autenticación, respaldado además por una cola de solo `MAX_CONCURRENT_RENDERS = 4` renders concurrentes (ver ADR-0003), es trivialmente agotable por cualquiera que descubra la URL — ya sea por accidente o intencionalmente. `docs/planning/PLAN-N8N-SPRINT-WORKFLOW.md` lo señala explícitamente como riesgo #3 y como bloqueante real antes de construir el workflow.

## Opciones consideradas

*(tal como quedaron documentadas en `docs/planning/PLAN-N8N-SPRINT-WORKFLOW.md`, "Decisiones confirmadas (Fase 0)", punto 1 — traducidas aquí a formato ADR)*

1. **Auth a nivel de túnel/infraestructura** (ej. Cloudflare Access, ngrok con auth token propio del túnel).
   - Pros: no requiere tocar código del backend; delega el control de acceso a una capa ya diseñada específicamente para eso, potencialmente más robusta que una implementación propia.
   - Contras: el control de acceso queda atado a cómo se termine resolviendo el deploy/túnel específico — si el mecanismo de exposición cambia (otro proveedor de túnel, deploy directo a un VPS sin esa capa, etc.), hay que reconfigurar la autenticación desde cero en la nueva capa; no distingue "quién" llama a nivel de aplicación, solo lo que esa capa externa decida exponer.

2. **API key propia validada en el backend** (header `X-API-Key` comparado contra un valor en `API_KEY` de `.env`).
   - Pros: control total desde el código del propio proyecto, independiente de cómo se resuelva el túnel o el deploy — funciona igual en local, en un túnel de prueba, o en un deploy futuro sin cambiar nada; la comparación se hace en tiempo constante (`crypto.timingSafeEqual`) para no filtrar por timing cuántos caracteres iniciales de la key acertó un caller.
   - Contras: una sola API key compartida no distingue qué caller específico está llamando (el workflow de n8n frente a cualquier otro consumidor futuro), ni permite revocar o rotar el acceso de uno sin afectar a todos los demás; mantenerla (rotarla, no filtrarla en logs, no commitearla) pasa a ser responsabilidad del propio proyecto en vez de delegarse a infraestructura ya endurecida para ese fin.

3. **Ambas combinadas** (defensa en profundidad: auth de túnel/infraestructura + API key de aplicación).
   - Mencionada explícitamente en el plan como alternativa no descartada de forma permanente; no implementada todavía porque no era necesaria para el alcance actual (un solo consumidor externo conocido).

## Decisión

Opción 2: API key propia, implementada como middleware condicional (`apiKeyAuth` en `document.routes.ts`, montado sobre todo el router `/api` en `server.ts`, antes del middleware de subida de archivos de Multer). El middleware es un no-op si `API_KEY` no está definida en `.env` — preserva sin fricción el comportamiento actual de uso local/frontend — y solo empieza a exigir el header `X-API-Key` (comparado en tiempo constante) cuando una instancia expuesta públicamente define esa variable.

## Consecuencias positivas

- Proteger el backend no depende de qué mecanismo de túnel o deploy se termine usando para exponerlo públicamente; la protección viaja con el propio código del proyecto.
- La comparación en tiempo constante (`timingSafeEqual`, descartando antes cualquier par de longitudes distintas) evita un vector de timing attack trivial contra la API key.
- El middleware protege todo `/api` de una sola vez, incluyendo la carga de archivos en `/extraer` — al aplicarse antes que `upload.single("archivo")` de Multer, un caller no autenticado nunca llega a que el servidor procese un archivo subido.

## Consecuencias negativas

- Una sola API key compartida entre todos los callers actuales y futuros (el workflow de n8n, y cualquier otro consumidor que se sume) no permite saber ni revocar el acceso de uno sin rotar la key para todos a la vez.
- Si la key se filtra (por un log, un commit accidental, un consumidor mal configurado), rotarla exige actualizarla manualmente en `.env` y en cada consumidor configurado — no hay mecanismo de rotación automática ni de múltiples keys por consumidor.
- No hay rate limiting ni ninguna distinción de identidad más allá de "tiene la key correcta o no la tiene" — la protección es binaria, no granular por caller.

## Notas de seguimiento

*(tomadas literalmente de `docs/planning/PLAN-N8N-SPRINT-WORKFLOW.md`, ya que ahí quedaron documentadas como condiciones explícitas de reconsideración)*: reconsiderar esta decisión si el backend termina expuesto por un mecanismo que ya impone su propia capa de autenticación (evitaría duplicar control), o si se necesita revocar/rotar accesos por consumidor individual sin tener que tocar código (hoy una sola API key compartida no distingue quién llama).
