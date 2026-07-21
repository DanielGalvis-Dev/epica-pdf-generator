# Variables de entorno y configuración

Todas las variables viven en `backend/.env` (no versionado — está en `.gitignore` en la raíz del repo). No hay ninguna variable de entorno del lado del frontend: `frontend/index.html` es estático y detecta en runtime si corre como `file://` (apunta a `http://localhost:3001`) o servido por el propio backend (usa `location.origin`).

## Tabla completa

| Variable | Tipo | Requerida | Default | Clasificación | Descripción |
|---|---|---|---|---|---|
| `OPENAI_API_KEY` | string | **Sí** | — (sin default, el servidor no arranca) | Secreta, solo servidor | API key de [OpenAI Platform](https://platform.openai.com/api-keys) (no la suscripción de ChatGPT). La usa `backend/src/core/ai/extractor.service.ts` vía `openai.beta.chat.completions.parse` para estructurar el Markdown subido en `/api/:docType/extraer`. |
| `PORT` | number | No | `3001` | Pública de configuración local | Puerto en el que escucha Express (`backend/src/server.ts`). |
| `API_KEY` | string | No | — (si no está definida, el middleware no bloquea nada) | Secreta, solo servidor | Ver `docs/SECURITY.md` para el detalle del mecanismo. Habilita el middleware `apiKeyAuth` (`backend/src/api/document.routes.ts`): si está definida, toda request a `/api/*` debe incluir el header `X-API-Key` con este mismo valor o responde `401 UNAUTHORIZED`. Pensada para cuando el backend se expone con una URL pública (ver `docs/planning/PLAN-N8N-SPRINT-WORKFLOW.md`) para que un workflow de n8n externo lo llame. |
| `CORS_ORIGIN` | string (lista separada por comas) | No | `http://localhost:{PORT},http://127.0.0.1:{PORT},null` | Pública de configuración local | Allowlist de orígenes permitidos por CORS (`backend/src/server.ts`). El default cubre el uso local (mismo puerto) y `frontend/index.html` abierto como `file://` (los navegadores mandan `Origin: null` en ese caso). Los requests sin header `Origin` (curl, o un caller servidor-a-servidor como n8n) siempre pasan, sin importar esta variable — CORS solo lo aplican los navegadores. Solo hace falta definirla si el frontend se sirve desde otro dominio/puerto. |

## Dónde obtener cada valor

- **`OPENAI_API_KEY`**: [platform.openai.com](https://platform.openai.com/api-keys) → "API keys" → "Create new secret key". Requiere una cuenta de OpenAI Platform con crédito/billing activo — es una cuenta distinta de una suscripción de ChatGPT Plus.
- **`PORT`**: no se "obtiene", se elige. Cualquier puerto libre en la máquina. Si ya hay otro proceso escuchando en 3001 (por ejemplo otro `npm run dev` de un compañero), usar `PORT=3002 npm run dev`.
- **`API_KEY`**: no la emite ningún proveedor externo — la genera quien despliega la instancia expuesta públicamente (por ejemplo, un valor aleatorio largo generado con `openssl rand -hex 32` o equivalente) y se comparte de forma segura con quien configure el consumidor (n8n).
- **`CORS_ORIGIN`**: no se "obtiene", se define según dónde se sirva el frontend. No hace falta tocarla para el uso local ni para `file://` (ya cubiertos por el default).

## Impacto si falta o es incorrecta

| Variable | Si falta | Si es incorrecta |
|---|---|---|
| `OPENAI_API_KEY` | El servidor loguea `"Falta la variable de entorno OPENAI_API_KEY..."` y hace `process.exit(1)` — no arranca. | `POST /api/:docType/extraer` responde `500 INTERNAL_ERROR` (la llamada a OpenAI falla; el detalle real solo queda en `console.error` del servidor). |
| `PORT` | Usa el default `3001`. No es un error. | N/A (cualquier valor se usa tal cual; si el puerto está ocupado, Express falla al hacer `listen` con un error de Node, visible en consola). |
| `API_KEY` | El middleware `apiKeyAuth` no bloquea nada — todo `/api/*` queda accesible sin autenticación (comportamiento actual por defecto, correcto para uso local). | Cualquier request sin el header `X-API-Key` exacto responde `401 UNAUTHORIZED` con el mismo formato de error que el resto de la API (`{success:false, code:"UNAUTHORIZED", message}`). |
| `CORS_ORIGIN` | Usa el default (`localhost`/`127.0.0.1` en el puerto configurado + `file://`). No es un error. | Un origen mal escrito en la lista simplemente no se agrega al allowlist — ese dominio recibirá error de CORS en el navegador; no afecta a callers sin header `Origin` (n8n, curl). |

## Archivo `.env.example`

Existe en `backend/.env.example` (ver ese archivo) con las 3 variables de arriba, valores de ejemplo o placeholders — nunca valores reales. Es el único archivo de configuración de entorno que se sube al repositorio; `backend/.env` con los valores reales nunca se versiona (confirmado en `.gitignore` de la raíz del repo: `.env` está listado).

## Notas

- No hay variables con prefijo público tipo `NEXT_PUBLIC_*` — no aplica, el frontend no tiene build step ni bundler que inyecte variables de entorno en el cliente.
- No hay variables "solo de desarrollo" (atajos de login, modo debug) — no existen en este proyecto.
- `docs/RUNBOOKS.md` y `docs/ENVIRONMENTS.md` documentan cómo se usan estas variables en cada entorno (hoy solo existe el entorno local).
