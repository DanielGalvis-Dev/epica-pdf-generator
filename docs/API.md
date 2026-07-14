# API — Polaria PDF Generator

Documentación de la API HTTP del backend (`backend/src/api/document.routes.ts`, montada en `backend/src/server.ts`). El proyecto no tiene Swagger/OpenAPI ni ninguna herramienta de documentación interactiva instalada (`backend/package.json` no incluye `swagger-ui-express`, `@nestjs/swagger`, ni similares) — este documento es, por ahora, la única fuente de verdad sobre el contrato de la API. No se agregó ninguna dependencia nueva para generarlo (ver `CLAUDE.md`, sección "Instrucciones para Claude").

## Base URL

```
http://localhost:3001
```

(`PORT` es configurable por variable de entorno; default `3001`). Todos los endpoints de esta guía cuelgan del prefijo `/api`. La API no está versionada en la URL (no hay `/api/v1/`) — cualquier cambio de contrato afecta a todos los consumidores por igual.

## Autenticación

Middleware: `apiKeyAuth` (`backend/src/api/document.routes.ts`), montado en `app.use("/api", apiKeyAuth)` (`backend/src/server.ts`) — **antes** que el parseo de archivos, así que un caller no autenticado nunca llega a subir un archivo.

**Es condicional, no siempre obligatoria:**

- Si la variable de entorno `API_KEY` **no** está definida en `backend/.env` (caso actual: uso local con el frontend propio), el middleware no valida nada — deja pasar cualquier request, con o sin headers de auth.
- Si `API_KEY` **sí** está definida (pensado para cuando el backend se expone con una URL pública, p. ej. para que n8n lo llame), **todos** los endpoints bajo `/api/*` exigen el header:

  ```
  X-API-Key: <valor de API_KEY>
  ```

  La comparación se hace en tiempo constante (`crypto.timingSafeEqual`) para no filtrar por timing. Si el header falta o no coincide, la respuesta es `401 UNAUTHORIZED` (ver más abajo). No hay concepto de roles ni de scopes — es una única API key compartida para todo el backend.

No hay expiración de la key (no es un token, es un secreto estático rotado a mano en `.env`).

## Formato de error estándar

Toda respuesta de error (cualquier endpoint) tiene esta forma (`ErrorResponseBody`, `backend/src/api/document.routes.ts`):

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Datos invalidos para el documento solicitado.",
  "details": { }
}
```

- `success`: siempre `false` en errores.
- `code`: uno de `NOT_FOUND | VALIDATION_ERROR | BAD_REQUEST | UPLOAD_ERROR | UNAUTHORIZED | INTERNAL_ERROR`.
- `message`: texto genérico y estable en español, pensado para que un workflow (n8n, etc.) lo parsee sin ambigüedad. **Nunca** es `err.message`/stack crudo — el detalle real solo se loguea en servidor con `console.error` (incluyendo el `docType`).
- `details`: opcional, solo presente en `VALIDATION_ERROR` (el `flatten()` de Zod).

## El patrón `:docType`

Los 4 endpoints son genéricos: `:docType` es una clave del registro `documentRegistry` (`backend/src/documents/registry.ts`). Hoy hay dos valores válidos:

| `docType` | Documento | Plantillas (`plantilla`) |
|---|---|---|
| `epica` | Resumen ejecutivo mensual de épicas | `default` (única, y es la default) |
| `sprint` | Resumen de sprint por miembro → proyecto → issue | `detail` (default), `resumen-inicio`, `resumen`, `resumen-v2` |

Si `:docType` no está registrado, **los 4 endpoints** responden igual:

**`404 NOT_FOUND`**
```json
{
  "success": false,
  "code": "NOT_FOUND",
  "message": "Tipo de documento no registrado: contrato"
}
```

El parámetro `plantilla` (query en `sample-preview`, campo `plantilla` en el body de `preview`/`pdf`) es siempre opcional: si no se manda, o se manda una clave que no existe en `config.templates`, el backend cae en silencio al `defaultTemplate` de ese `docType` (no es un error).

---

## 1. `GET /api/:docType/sample-preview`

**Descripción de negocio:** Devuelve el HTML de una vista previa de ejemplo (con datos ficticios pero realistas del dominio, no del documento real del usuario) para que el frontend pueda mostrar cómo luce cada plantilla sin gastar una llamada a la IA. Es la vista que se usa para "previsualizar" antes de subir un `.md`.

- **Método:** `GET`
- **URL:** `/api/:docType/sample-preview`
- **Autenticación:** `X-API-Key` — condicional (ver sección Autenticación).

**Parámetros de ruta**

| Nombre | Tipo | Requerido | Descripción | Ejemplo |
|---|---|---|---|---|
| `docType` | string | Sí | Tipo de documento registrado | `sprint` |

**Parámetros de query**

| Nombre | Tipo | Requerido | Default | Descripción | Ejemplo |
|---|---|---|---|---|---|
| `plantilla` | string | No | `config.defaultTemplate` del `docType` (`default` en epica, `detail` en sprint) | Clave de plantilla a renderizar | `resumen` |

**Headers requeridos:** ninguno más allá de `X-API-Key` (condicional). No lleva body.

**Respuesta 200 (éxito):** `Content-Type: text/html`, cuerpo = HTML crudo ya renderizado (pensado para cargarse en un `<iframe>`, no envuelto en JSON).

```
GET /api/sprint/sample-preview?plantilla=resumen HTTP/1.1
Host: localhost:3001
```

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

<!DOCTYPE html>
<html>
  <head>...</head>
  <body>
    <h1>1 JUNIO-JULIO 2026</h1>
    ...
  </body>
</html>
```

**Respuestas de error**

| Código | `code` | Cuándo ocurre | Ejemplo de body |
|---|---|---|---|
| 404 | `NOT_FOUND` | `docType` no registrado | `{"success":false,"code":"NOT_FOUND","message":"Tipo de documento no registrado: contrato"}` |
| 404 | `NOT_FOUND` | `docType` registrado pero sin datos de ejemplo en `documentSamples` (hoy no ocurre con `epica`/`sprint`, aplicaría a un `docType` nuevo agregado sin `sample-data.ts`) | `{"success":false,"code":"NOT_FOUND","message":"No hay datos de ejemplo para sprint."}` |
| 401 | `UNAUTHORIZED` | Falta o es inválido `X-API-Key`, solo si `API_KEY` está definida en el servidor | `{"success":false,"code":"UNAUTHORIZED","message":"API key invalida o faltante."}` |
| 500 | `INTERNAL_ERROR` | Falla inesperada al renderizar (p. ej. plantilla Handlebars corrupta) | `{"success":false,"code":"INTERNAL_ERROR","message":"Error al generar preview de ejemplo."}` |

**Límites:** ninguno específico de este endpoint (no recibe body ni archivo).

---

## 2. `POST /api/:docType/extraer`

**Descripción de negocio:** Recibe el Markdown crudo de un documento (épica o sprint) redactado por una persona del equipo, y usa IA (OpenAI `gpt-4o-mini`) para extraerlo y estructurarlo en el JSON que después el usuario revisa/edita antes de generar el PDF. Es el primer paso del flujo ("subir `.md`").

- **Método:** `POST`
- **URL:** `/api/:docType/extraer`
- **Autenticación:** `X-API-Key` — condicional (ver sección Autenticación). Se valida **antes** de procesar el archivo subido.

**Parámetros de ruta**

| Nombre | Tipo | Requerido | Descripción | Ejemplo |
|---|---|---|---|---|
| `docType` | string | Sí | Tipo de documento registrado | `epica` |

**Headers requeridos**

| Header | Valor | Notas |
|---|---|---|
| `Content-Type` | `multipart/form-data; boundary=...` | Lo fija el cliente HTTP automáticamente al armar el form-data; no se setea a mano. |

**Request body:** `multipart/form-data` con un único campo de archivo.

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `archivo` | file (`.md`) | Sí | Contenido Markdown del documento a extraer. Debe terminar en `.md`, o traer `mimetype` `text/markdown` o `text/plain`. Tamaño máximo 2 MB. |

Ejemplo de request (curl) con un Markdown real de sprint:

```bash
curl -X POST http://localhost:3001/api/sprint/extraer \
  -H "X-API-Key: $API_KEY" \
  -F "archivo=@sprint-1-junio-julio-2026.md;type=text/markdown"
```

Contenido de ejemplo de `sprint-1-junio-julio-2026.md` (fragmento real del dominio, no genérico):

```markdown
# Sprint 1 · Junio-Julio 2026 (22 jun – 29 jun)

## Luis Daniel Cantillo Ospino — Polaria App v2.0
- [Done] Esquema BD operativo V2 (bodegas, catálogos, órdenes, warehouse_state) — Feature, High
- [Done] Configurar multi-tenant y RLS base en Supabase — Feature, Medium
- [Done] Base frontend Next.js y shell multi-rol (dashboard + configurador) — Feature, High
- [Done] Desarrollar módulo de autenticación para Polaria web v2.0 — Feature, High
- [Done] (agregado durante el sprint) Base backend modular NestJS para Polaria web v2.0 — Feature, Medium

## Mauricio Jose Manjarres Duque — Mateo, consultas deterministas
- [Done] Mapeo e Integración de la Vista de Kardex y Facturación - Revisar Flujo IA/Tool — Feature, High
- [Done] Construir Casos de Uso Mateo Polaria — Compras y Ventas (KPI1, KPI2 y KPI3) — Feature, Medium
- [Todo] (agregado durante el sprint) Mapeo e Integración de Vistas de Ventas y Compras - Revisar Flujo IA/Tool — Feature, High
- [Done] Construir Casos de Uso Mateo TCI (KPI1, KPI2 y KPI3) — Feature, Medium
```

**Respuesta 200 (éxito):** `Content-Type: application/json`. `datos` cumple el schema Zod del `docType` (`EpicaSchema` o `SprintSchema`); `uso` es el consumo real reportado por OpenAI.

```json
{
  "success": true,
  "datos": {
    "sprintName": "1 JUNIO-JULIO 2026",
    "dateStart": "Jun 22",
    "dateEnd": "Jun 29",
    "weekNumber": "1",
    "estadoSprint": "CUMPLIDO",
    "porcentajeCompletado": 100,
    "horas": {
      "segmentos": [
        { "nombre": "Proyectos (3 objetivos)", "horas": 94.4 },
        { "nombre": "Reuniones", "horas": 9.6 },
        { "nombre": "Incidencias", "horas": 16 }
      ]
    },
    "members": [
      {
        "name": "LUIS DANIEL CANTILLO OSPINO",
        "initials": "LC",
        "objetivo": "Luis levanto la base operativa de la nueva app web de Polaria version 2.0. Diseno el esquema de base de datos para bodegas, catalogos, ordenes y estado de almacen, y configuro el modelo multi-tenant con seguridad a nivel de fila en Supabase. En paralelo construyo el backend modular en NestJS, el modulo de autenticacion y avanzo en el shell multi-rol del frontend en Next.js, dejando la base lista para que el equipo conecte los modulos de compras y configuracion el proximo sprint.",
        "projects": [
          {
            "name": "Polaria App - Construir aplicación web v2.0",
            "issues": [
              {
                "title": "Esquema BD operativo V2 (bodegas, catálogos, órdenes, warehouse_state)",
                "type": "Feature",
                "priority": "High",
                "status": "Done",
                "agregado": false
              }
            ]
          }
        ]
      }
    ],
    "equipo": {
      "quien": "Equipo enfocado (3 personas) - Dani, Mauro y Lucho, un proyecto cada uno",
      "cuando": "22 jun a 29 jun, 1 semana (7 dias)",
      "donde": "Produccion, WhatsApp, Linear, clientes Mateo Support / Polaria",
      "como": "NestJS, Supabase, n8n, Next.js, Linear"
    },
    "riesgoTransversal": {
      "texto": "La migracion de datos y los nuevos modulos web corren en paralelo sin ambiente de pruebas dedicado, lo que puede generar errores que solo se detecten en produccion.",
      "mitigacion": "Validar cada entrega con datos reales antes de cerrarla y monitorear de cerca los primeros dias."
    },
    "desviaciones": {
      "logrado": "El plan inicial se cumplio parcialmente: algunos issues planeados quedaron abiertos por mayor complejidad de la esperada, mientras el equipo sumo trabajo no previsto que surgio durante la semana.",
      "motivo": "Los issues agregados respondieron a incidencias y pedidos que aparecieron en curso; los planeados sin cerrar pasan al siguiente sprint."
    }
  },
  "uso": {
    "modelo": "gpt-4o-mini",
    "tokensEntrada": 1842,
    "tokensSalida": 963,
    "tokensTotal": 2805,
    "costoEstimadoUsd": 0.000854
  }
}
```

**Respuestas de error**

| Código | `code` | Cuándo ocurre | Ejemplo de body |
|---|---|---|---|
| 404 | `NOT_FOUND` | `docType` no registrado | `{"success":false,"code":"NOT_FOUND","message":"Tipo de documento no registrado: contrato"}` |
| 400 | `BAD_REQUEST` | No llegó ningún archivo en el campo `archivo` (o el nombre de campo es distinto) | `{"success":false,"code":"BAD_REQUEST","message":"No se recibio ningun archivo .md."}` |
| 400 | `BAD_REQUEST` | El archivo llegó pero está vacío (o solo espacios en blanco) | `{"success":false,"code":"BAD_REQUEST","message":"El archivo esta vacio."}` |
| 400 | `UPLOAD_ERROR` | El archivo no es `.md`/`text/markdown`/`text/plain` (rechazado por el `fileFilter` de multer), o cualquier otro `MulterError` que no sea de tamaño | `{"success":false,"code":"UPLOAD_ERROR","message":"Error al procesar el archivo subido."}` |
| 413 | `UPLOAD_ERROR` | El archivo supera los 2 MB (`MulterError` `LIMIT_FILE_SIZE`) | `{"success":false,"code":"UPLOAD_ERROR","message":"Error al procesar el archivo subido."}` |
| 401 | `UNAUTHORIZED` | Falta o es inválido `X-API-Key`, solo si `API_KEY` está definida en el servidor | `{"success":false,"code":"UNAUTHORIZED","message":"API key invalida o faltante."}` |
| 500 | `INTERNAL_ERROR` | OpenAI no devuelve datos parseables, o cualquier otra falla inesperada durante la extracción (incluye timeouts/errores transitorios de OpenAI ya reintentados por el SDK: 2 reintentos, 30s de timeout) | `{"success":false,"code":"INTERNAL_ERROR","message":"Error al extraer datos."}` |

**Límites**

- Tamaño máximo de archivo: **2 MB** (`multer` `limits.fileSize`).
- Solo se acepta extensión `.md` (o `mimetype` `text/markdown`/`text/plain`); cualquier otro tipo se rechaza con `UPLOAD_ERROR`.
- Timeout hacia OpenAI: 30s, con 2 reintentos automáticos del SDK solo ante errores transitorios (408/409/429/5xx o de red) — 400/401/403/404/422 no se reintentan.
- No hay rate limiting propio en la API (no hay `express-rate-limit` ni similar instalado); el único costo por request es monetario (tokens de OpenAI, ver `uso.costoEstimadoUsd`).

---

## 3. `POST /api/:docType/preview`

**Descripción de negocio:** Recibe el JSON ya revisado/editado por el usuario (el resultado de `/extraer`, potencialmente corregido a mano) y devuelve el HTML final tal como va a quedar en el PDF, para previsualizarlo antes de descargar.

- **Método:** `POST`
- **URL:** `/api/:docType/preview`
- **Autenticación:** `X-API-Key` — condicional (ver sección Autenticación).

**Parámetros de ruta**

| Nombre | Tipo | Requerido | Descripción | Ejemplo |
|---|---|---|---|---|
| `docType` | string | Sí | Tipo de documento registrado | `epica` |

**Headers requeridos**

| Header | Valor |
|---|---|
| `Content-Type` | `application/json` |

**Request body:** el objeto de datos validado contra el schema del `docType` (`EpicaSchema` o `SprintSchema`, ver detalle de ambos en la sección "Ejemplos completos" más abajo), más un `plantilla` opcional. Se acepta en dos formas equivalentes:

```json
{ "datos": { /* ...campos del schema... */ }, "plantilla": "resumen" }
```

o directamente los campos del schema en la raíz del body (sin envolver en `datos`), con `plantilla` como hermano:

```json
{ /* ...campos del schema... */, "plantilla": "resumen" }
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `datos` | object | No (alternativa: campos en la raíz) | Objeto que cumple el schema Zod del `docType` |
| `plantilla` | string | No | Clave de `config.templates`; si no existe, se usa `config.defaultTemplate` |

**Respuesta 200 (éxito):** `Content-Type: text/html`, HTML crudo.

Ejemplo con `epica` (body completo, ver schema detallado abajo):

```http
POST /api/epica/preview HTTP/1.1
Content-Type: application/json

{
  "periodo": "JUNIO-JULIO",
  "fechaInicio": "22 JUN",
  "fechaFin": "20 JUL",
  "duracion": "4 SEMANAS",
  "epicas": [
    {
      "nombreCorto": "Bodega Fria v2.0",
      "subtitulo": "MEJORA DE OPERACIONES",
      "responsable": "LUCHO",
      "objetivo": "Desarrollar la aplicación web v2.0 para la bodega fría, mejorando la gestión de inventarios y evitando errores de duplicidad y concurrencia en el proceso.",
      "alcance": "Implementar módulos de autenticación, mapa de bodega, ventas, transporte y reportería, asegurando un flujo operativo sin conflictos de datos.",
      "kpis": ["100% MODULOS", "1 FLUJO COMPLETO", "9 ROLES FUNCIONANDO"],
      "resultadoEsperado": "El 100% de los módulos operativos en producción, con un flujo de trabajo completo y sin conflictos en el manejo de datos de inventario.",
      "riesgo": "El principal riesgo es no lograr el despliegue completo de los módulos, lo que podría afectar la operación de la bodega fría y generar retrasos en el servicio."
    },
    {
      "nombreCorto": "Mateo v2.0",
      "subtitulo": "CONSULTAS HUMANIZADAS",
      "responsable": "MAURO",
      "objetivo": "Desarrollar una capacidad de consulta determinista en Mateo, permitiendo respuestas precisas y humanizadas a través de WhatsApp para los usuarios.",
      "alcance": "Conectar 6 vistas normalizadas de Supabase para consultas sobre inventarios, compras y ventas, garantizando respuestas exactas y naturales.",
      "kpis": ["6 VISTAS CONECTADAS", "90% PRECISION", "<5S RESPUESTA"],
      "resultadoEsperado": "Obtener respuestas exactas y naturales en WhatsApp sobre Kardex, inventarios, compras y ventas, mejorando la experiencia del usuario.",
      "riesgo": "El riesgo principal es no alcanzar la precisión deseada en las respuestas, lo que podría llevar a confusiones y decisiones erróneas por parte de los usuarios."
    },
    {
      "nombreCorto": "Mateo Support v1.2",
      "subtitulo": "AUTOMATIZACION DE TICKETS",
      "responsable": "DANI",
      "objetivo": "Implementar Mateo Support para gestionar tickets automáticamente, permitiendo a los usuarios reportar problemas sin intervención manual.",
      "alcance": "Desplegar módulos que permitan leer imágenes, consultar documentación y registrar tickets en Linear de forma autónoma desde WhatsApp.",
      "kpis": ["3/3 MODULOS", "90% TICKETS CORRECTOS", "90% CONSULTAS CORRECTAS"],
      "resultadoEsperado": "Mateo Support operando en producción, gestionando tickets y consultas de manera autónoma y eficiente, mejorando el soporte al usuario.",
      "riesgo": "El riesgo principal es que los módulos no funcionen como se espera, lo que podría generar una carga adicional en el equipo de soporte y desorganización en la gestión de tickets."
    }
  ],
  "equipo": {
    "quien": "Equipo enfocado (3 personas) - Lucho, Mauro y Dani, un objetivo cada uno",
    "cuando": "22 jun a 20 jul, 4 semanas (28 dias)",
    "donde": "Producción, WhatsApp, Linear, clientes Polaria / TCI JBR",
    "como": "n8n, Cloudinary, Supabase"
  },
  "riesgoTransversal": {
    "texto": "El riesgo que afecta a todas las épicas es la posibilidad de no cumplir con los plazos de entrega, lo que podría generar retrasos en la operación y afectar la satisfacción del cliente.",
    "mitigacion": "Se mitigará este riesgo estableciendo revisiones periódicas del avance de cada épica y priorizando las tareas críticas para asegurar el cumplimiento de los plazos."
  }
}
```

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

<!DOCTYPE html>...
```

**Respuestas de error**

| Código | `code` | Cuándo ocurre | Ejemplo de body |
|---|---|---|---|
| 404 | `NOT_FOUND` | `docType` no registrado | `{"success":false,"code":"NOT_FOUND","message":"Tipo de documento no registrado: contrato"}` |
| 400 | `VALIDATION_ERROR` | El body no cumple el schema Zod del `docType` (campo faltante, tipo incorrecto, enum inválido, string fuera del `max()`, etc.) | ver ejemplo abajo |
| 401 | `UNAUTHORIZED` | Falta o es inválido `X-API-Key`, solo si `API_KEY` está definida en el servidor | `{"success":false,"code":"UNAUTHORIZED","message":"API key invalida o faltante."}` |
| 500 | `INTERNAL_ERROR` | Falla inesperada al renderizar el HTML | `{"success":false,"code":"INTERNAL_ERROR","message":"Error al generar preview."}` |

Ejemplo real de `400 VALIDATION_ERROR` (se mandó `sprint` sin `members` y con un `priority` inválido):

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Datos invalidos para el documento solicitado.",
  "details": {
    "formErrors": [],
    "fieldErrors": {
      "members": ["Required"],
      "estadoSprint": ["Invalid enum value. Expected 'CUMPLIDO' | 'NO CUMPLIDO', received 'EN PROGRESO'"]
    }
  }
}
```

(`details` es exactamente el resultado de `parsed.error.flatten()` de Zod — `formErrors` para errores a nivel raíz, `fieldErrors` mapeado por nombre de campo de primer nivel.)

**Límites**

- El body JSON completo no puede superar **2 MB** (`express.json({ limit: "2mb" })`, global a todo el backend) — un `sprint` con muchísimos issues podría chocar contra esto; si ocurre, Express responde con su propio error de parseo antes de llegar al handler (no pasa por `sendError`, cae en el manejador de errores genérico de `server.ts` → `500 INTERNAL_ERROR`).
- No hay rate limiting propio.

---

## 4. `POST /api/:docType/pdf`

**Descripción de negocio:** Igual que `/preview` (mismo body, misma validación), pero en vez de HTML devuelve el PDF final ya renderizado, listo para descargar o adjuntar. Es el último paso del flujo.

- **Método:** `POST`
- **URL:** `/api/:docType/pdf`
- **Autenticación:** `X-API-Key` — condicional (ver sección Autenticación).

**Parámetros de ruta**

| Nombre | Tipo | Requerido | Descripción | Ejemplo |
|---|---|---|---|---|
| `docType` | string | Sí | Tipo de documento registrado | `sprint` |

**Headers requeridos**

| Header | Valor |
|---|---|
| `Content-Type` | `application/json` |

**Request body:** idéntico en forma y validación al de `/preview` (ver arriba): `{ datos, plantilla? }` o los campos del schema en la raíz + `plantilla` opcional.

**Respuesta 200 (éxito):**

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="sprint_1752438123456.pdf"
```

Cuerpo: binario del PDF (bytes crudos, no JSON). El nombre de archivo es `{docType}_{timestamp epoch ms}.pdf`, saneado a `[a-zA-Z0-9_-]`.

Ejemplo de request con `sprint` y `plantilla` explícita:

```http
POST /api/sprint/pdf HTTP/1.1
Content-Type: application/json

{
  "plantilla": "resumen",
  "datos": {
    "sprintName": "1 JUNIO-JULIO 2026",
    "dateStart": "Jun 22",
    "dateEnd": "Jun 29",
    "weekNumber": "1",
    "estadoSprint": "CUMPLIDO",
    "porcentajeCompletado": 100,
    "horas": {
      "segmentos": [
        { "nombre": "Proyectos (3 objetivos)", "horas": 94.4 },
        { "nombre": "Reuniones", "horas": 9.6 },
        { "nombre": "Incidencias", "horas": 16 }
      ]
    },
    "members": [
      {
        "name": "DANIEL DE JESUS GALVIS ZAMBRANO",
        "initials": "DG",
        "objetivo": "Daniel concentro su semana en preparar a Mateo Support para produccion sobre Supabase. Migro la base de datos operativa desde MySQL, construyo la infraestructura de RAG con pgvector y conecto el manual de usuario al flujo de consulta para que cada ticket se resuelva con contexto real antes de escalar. Tambien activo el manejador de errores en produccion, corrigio el identificador de numero telefonico y dejo resuelta la deuda tecnica que quedaba pendiente antes del despliegue de la version 1.2.0.",
        "projects": [
          {
            "name": "Mateo Support - Desplegar v1.2.0 en producción",
            "issues": [
              {
                "title": "Activar Error Handler de Mateo Support en producción",
                "type": "Feature",
                "priority": "High",
                "status": "Done",
                "agregado": false
              },
              {
                "title": "Crear infraestructura DB para RAG en Supabase (pgvector + tabla + función)",
                "type": "Feature",
                "priority": "High",
                "status": "Done",
                "agregado": true
              }
            ]
          }
        ]
      }
    ],
    "equipo": {
      "quien": "Equipo enfocado (3 personas) - Dani, Mauro y Lucho, un proyecto cada uno",
      "cuando": "22 jun a 29 jun, 1 semana (7 dias)",
      "donde": "Produccion, WhatsApp, Linear, clientes Mateo Support / Polaria",
      "como": "NestJS, Supabase, n8n, Next.js, Linear"
    },
    "riesgoTransversal": {
      "texto": "La migracion de datos y los nuevos modulos web corren en paralelo sin ambiente de pruebas dedicado, lo que puede generar errores que solo se detecten en produccion.",
      "mitigacion": "Validar cada entrega con datos reales antes de cerrarla y monitorear de cerca los primeros dias."
    },
    "desviaciones": {
      "logrado": "El plan inicial se cumplio parcialmente: algunos issues planeados quedaron abiertos por mayor complejidad de la esperada, mientras el equipo sumo trabajo no previsto que surgio durante la semana.",
      "motivo": "Los issues agregados respondieron a incidencias y pedidos que aparecieron en curso; los planeados sin cerrar pasan al siguiente sprint."
    }
  }
}
```

**Respuestas de error**

| Código | `code` | Cuándo ocurre | Ejemplo de body |
|---|---|---|---|
| 404 | `NOT_FOUND` | `docType` no registrado | `{"success":false,"code":"NOT_FOUND","message":"Tipo de documento no registrado: contrato"}` |
| 400 | `VALIDATION_ERROR` | El body no cumple el schema Zod del `docType` | mismo formato que en `/preview` (`details` = `parsed.error.flatten()`) |
| 401 | `UNAUTHORIZED` | Falta o es inválido `X-API-Key`, solo si `API_KEY` está definida en el servidor | `{"success":false,"code":"UNAUTHORIZED","message":"API key invalida o faltante."}` |
| 500 | `INTERNAL_ERROR` | Falla al renderizar el PDF: error de Playwright/Chromium, o **timeout de render superado** (ver Límites abajo) | `{"success":false,"code":"INTERNAL_ERROR","message":"Error al generar PDF."}` |

**Límites**

- Mismo límite de **2 MB** en el body JSON que `/preview` (`express.json({ limit: "2mb" })`).
- **Timeout duro de renderizado: 15 segundos** (`RENDER_TIMEOUT_MS` en `backend/src/core/generators/pdf.generator.ts`), aplicado independientemente a `page.setContent(...)` (carga del HTML + fuentes/íconos desde CDN) y a `page.pdf(...)`. Si cualquiera de los dos pasos supera los 15s, la promesa se rechaza y el endpoint responde `500 INTERNAL_ERROR` con el mensaje genérico de arriba (el detalle real, `Timeout de 15000ms superado en page.pdf()` o similar, solo queda en el log de servidor).
- El backend mantiene un único browser Chromium (singleton) y permite hasta **4 renders simultáneos** (`MAX_CONCURRENT_RENDERS`); una 5ª request concurrente se encola en memoria (no se rechaza ni devuelve error) hasta que se libera un cupo. El tiempo en cola no cuenta contra el timeout de 15s — solo el render en sí una vez que arranca.
- El alto de la página del PDF es auto-ajustable: crece si el contenido no entra en el `pdf.height` mínimo configurado por la plantilla, nunca se recorta contenido en silencio. El ancho (`pdf.width`) sí es fijo por plantilla (900px en `sprint`/`detail`, 1240px en el resto).
- No hay rate limiting propio en este endpoint (es, con `/extraer`, el más costoso en CPU/memoria del backend por el render de Chromium).

---

## Ejemplos completos por `docType`

### `epica` — schema (`EpicaSchema`, `backend/src/documents/epica/config.ts`)

| Campo | Tipo | Requerido | Restricciones |
|---|---|---|---|
| `periodo` | string | Sí | — |
| `fechaInicio` | string | Sí | — |
| `fechaFin` | string | Sí | — |
| `duracion` | string | Sí | — |
| `epicas` | array de objeto | Sí | mínimo 1 elemento |
| `epicas[].nombreCorto` | string | Sí | — |
| `epicas[].subtitulo` | string | Sí | — |
| `epicas[].responsable` | string | Sí | — |
| `epicas[].objetivo` | string | Sí | máx. 260 caracteres |
| `epicas[].alcance` | string | Sí | máx. 200 caracteres |
| `epicas[].kpis` | array de string | Sí | mínimo 1 elemento |
| `epicas[].resultadoEsperado` | string | Sí | máx. 200 caracteres |
| `epicas[].riesgo` | string | Sí | máx. 200 caracteres |
| `equipo.quien` | string | Sí | máx. 150 caracteres |
| `equipo.cuando` | string | Sí | máx. 150 caracteres |
| `equipo.donde` | string | Sí | máx. 150 caracteres |
| `equipo.como` | string | Sí | máx. 150 caracteres |
| `riesgoTransversal.texto` | string | Sí | máx. 320 caracteres |
| `riesgoTransversal.mitigacion` | string | Sí | máx. 200 caracteres |

Nota: `epica` no recibe bloque de horas en el body — `horas` es fijo (`HORAS_FIJAS` en `backend/src/constants.ts`) y se agrega automáticamente al renderizar (`componerDatosEpica`), no es parte del contrato de la API.

El ejemplo completo de request/response para `epica` está en la sección 3 (`/preview`) arriba; es el mismo body válido para `/pdf`.

### `sprint` — schema (`SprintSchema`, `backend/src/documents/sprint/config.ts`)

| Campo | Tipo | Requerido | Restricciones |
|---|---|---|---|
| `sprintName` | string | Sí | se normaliza a mayúsculas en el servidor |
| `dateStart` | string | Sí | — |
| `dateEnd` | string | Sí | — |
| `weekNumber` | string | Sí | — |
| `estadoSprint` | enum | Sí | `"CUMPLIDO"` \| `"NO CUMPLIDO"` |
| `porcentajeCompletado` | number | Sí | 0–100 |
| `horas.segmentos` | array de objeto | Sí | mínimo 1 elemento |
| `horas.segmentos[].nombre` | string | Sí | — |
| `horas.segmentos[].horas` | number | Sí | ≥ 0 |
| `members` | array de objeto | Sí | mínimo 1 elemento |
| `members[].name` | string | Sí | — |
| `members[].initials` | string | Sí | — |
| `members[].objetivo` | string | Sí | máx. 600 caracteres (el prompt de IA apunta a 480–500 exactos, pero el schema solo exige el máximo) |
| `members[].projects` | array de objeto | Sí | mínimo 1 elemento |
| `members[].projects[].name` | string | Sí | — |
| `members[].projects[].issues` | array de objeto | Sí | mínimo 1 elemento |
| `...issues[].title` | string | Sí | — |
| `...issues[].type` | enum | Sí | `"Bug"` \| `"Feature"` \| `"Improvement"` |
| `...issues[].priority` | enum | Sí | `"Urgent"` \| `"High"` \| `"Medium"` \| `"Low"` |
| `...issues[].status` | enum | Sí | `"Todo"` \| `"In Progress"` \| `"In Review"` \| `"Done"` \| `"Cancelled"` |
| `...issues[].agregado` | boolean | Sí | `true` si el issue se sumó durante el sprint (no estaba planeado) |
| `equipo.quien` / `.cuando` / `.donde` / `.como` | string | Sí | máx. 150 caracteres cada uno |
| `riesgoTransversal.texto` | string | Sí | máx. 320 caracteres |
| `riesgoTransversal.mitigacion` | string | Sí | máx. 200 caracteres |
| `desviaciones.logrado` | string | Sí | máx. 320 caracteres |
| `desviaciones.motivo` | string | Sí | máx. 200 caracteres |

El ejemplo completo de request/response para `sprint` está en las secciones 2 (`/extraer`) y 4 (`/pdf`) arriba.

---

## Resumen de límites operativos

| Límite | Valor | Dónde se aplica |
|---|---|---|
| Tamaño máximo de archivo `.md` | 2 MB | `POST /:docType/extraer` |
| Extensión/mimetype de archivo aceptado | `.md`, `text/markdown`, `text/plain` | `POST /:docType/extraer` |
| Tamaño máximo de body JSON | 2 MB | `POST /:docType/preview`, `POST /:docType/pdf` |
| Timeout hacia OpenAI | 30s, 2 reintentos en errores transitorios | `POST /:docType/extraer` |
| Timeout de render (Chromium) | 15s por paso (`setContent` y `page.pdf()` por separado) | `POST /:docType/pdf` |
| Renders simultáneos | 4 (extra se encola, no se rechaza) | `POST /:docType/pdf` |
| Rate limiting | No implementado | Todos los endpoints |
| Autenticación | `X-API-Key`, solo si `API_KEY` está definida en `.env` del servidor | Todos los endpoints bajo `/api` |
| CORS | Allowlist (`localhost`/`127.0.0.1` en el puerto configurado, `file://`, y sin header `Origin` — configurable con `CORS_ORIGIN`, ver `docs/ENV_VARS.md`) | Todos los endpoints |
