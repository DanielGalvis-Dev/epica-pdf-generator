# Guía de observabilidad y monitoreo

**Prioridad: Baja.** Estado real hoy: **mínimo, sin herramientas dedicadas.** Este documento describe honestamente lo que existe (para que el equipo sepa dónde mirar si algo falla) y qué falta (para que no se asuma que hay alertas o métricas que en realidad no existen).

## Los tres pilares — estado actual

| Pilar | Estado |
|---|---|
| Logs | **Parcial.** Solo `console.error`/`console.log` a stdout. Sin nivel estructurado (`debug`/`info`/`warn`/`error`), sin formato JSON, sin agregación ni retención más allá de lo que capture quien corra el proceso (terminal local, o el log del proceso en el host de deploy que se elija). |
| Métricas | **Inexistente.** No hay ninguna métrica recolectada (latencia, tasa de error, uso de recursos). |
| Alertas | **Inexistente.** Nadie se entera de un fallo salvo que lo vea en la terminal o un usuario lo reporte. |

## Qué se loguea hoy (grep real sobre el código)

Todos los `console.error` de `backend/src/api/document.routes.ts` siguen el mismo patrón: `` `Error en /api/${docType}/<endpoint>:` `` seguido del error completo — es la convención que ya sigue el proyecto (ver `CLAUDE.md`, sección "Convenciones existentes": "con `console.error` previo incluyendo el `docType`"). Además:
- `backend/src/server.ts` loguea si falta `OPENAI_API_KEY` (antes de salir del proceso) y el estado del shutdown ordenado (`SIGTERM`/`SIGINT`).
- `backend/src/core/generators/pdf.generator.ts` no loguea explícitamente los timeouts de render (`RENDER_TIMEOUT_MS`) — el error se propaga como excepción y termina en el `console.error` genérico de la ruta que lo llamó.

Ningún log incluye `requestId`, `timestamp` explícito más allá del que agregue la terminal/host, ni contexto estructurado (`userId` no aplica — no hay usuarios).

## Qué falta si se quisiera adoptar observabilidad real

No es una decisión de este documento tomarla — solo se deja el punto de partida si el equipo decide invertir en esto más adelante, priorizado igual que sugiere la guía interna: empezar por lo más barato.

1. **Uptime del backend expuesto públicamente** (relevante una vez que exista la URL pública para n8n, ver `docs/planning/PLAN-N8N-SPRINT-WORKFLOW.md`): un monitor externo gratuito (ej. UptimeRobot) pegándole a `GET /api/epica/sample-preview` cada 5 minutos sería la primera pieza de observabilidad con mejor relación costo/beneficio — detecta caídas antes de que n8n falle silenciosamente.
2. **Captura de errores no manejados**: hoy el `error-handler` genérico de `server.ts` ya evita que un error tire el proceso o devuelva HTML de error en vez de JSON — pero nada notifica al equipo cuando ocurre. Una integración simple (Sentry, o incluso un webhook a Slack desde el mismo `console.error`) cerraría ese hueco sin mucho esfuerzo.
3. **Métricas del render de PDF**: dado que existe un límite duro de concurrencia (`MAX_CONCURRENT_RENDERS = 4`) y de timeout (`RENDER_TIMEOUT_MS = 15_000`), la métrica más útil de negocio sería cuántos renders golpean ese timeout o esperan en la cola — hoy no se mide, y sería la señal más temprana de que el proyecto necesita subir esos límites o mover el render a otro proceso.

## Runbook de primera respuesta (el único que aplica hoy)

- **Síntoma**: un endpoint responde `500 INTERNAL_ERROR`. **Primera respuesta**: revisar la salida de `console.error` en la terminal/log del proceso — el mensaje ahí incluye el `docType` y, para errores de render, el motivo (`Timeout de Nms superado en...`, error de Playwright, etc.). No hay ningún otro lugar donde mirar hoy.
