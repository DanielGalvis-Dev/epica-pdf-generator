# Compliance y normativas aplicables

**Prioridad: Baja.** ⚠️ Este documento es una evaluación técnica preliminar, **no asesoría legal**. Antes de tratar cualquier conclusión de acá como definitiva, consultar con quien en Polaria sea responsable de temas legales/compliance — la guía interna es explícita en este punto.

## Evaluación por área (checklist de la guía)

| Área | ¿Aplica? | Razonamiento |
|---|---|---|
| Protección de datos personales (Ley 1581 Colombia / GDPR / LGPD) | **Posiblemente, en grado mínimo — pendiente de confirmar** | El sistema almacena y muestra nombres de personas del equipo (`members[].name` en `SprintSchema`, ej. "Luis", "Mauricio", "Daniel") dentro de reportes internos de sprint. Es un dato personal (nombre) pero de empleados internos en un reporte interno de desempeño, no de clientes/terceros — el análisis de qué régimen aplica (si alguno, más allá de política interna de RRHH) requiere confirmación legal, no es algo que este documento pueda resolver. |
| Sector alimentario / cadena de frío (INVIMA/FDA) | **No aplica** | El sistema es un generador de documentos PDF (reportes de épicas/sprints); no opera equipos ni procesos de la cadena de frío ni maneja datos de temperatura regulados. |
| Seguridad de la información (SOC2 / ISO 27001) | **No evaluado / no exigido hoy** | No hay indicación de que algún cliente o contrato exija una certificación formal. Si eso cambia, este documento debe actualizarse. |
| Multi-tenancy y aislamiento | **No aplica** | Es una instancia única para uso interno de Polaria, sin múltiples organizaciones/clientes compartiendo la instancia. |
| Retención de datos | **No definida — pendiente** | No hay política de retención documentada para los `.md` subidos ni para los PDFs generados. El backend no persiste nada en disco/base de datos más allá de la ejecución del request (no hay base de datos en este proyecto); los PDFs generados los retiene quien los descarga (Google Drive, en el flujo de n8n planeado). |
| Auditoría | **Mínima** | Solo `console.error` sin agregación (ver `docs/OBSERVABILITY.md`) — no hay un registro de auditoría inmutable de accesos ni de qué datos se procesaron. |

## Checklist mínimo de datos personales (de la guía) — estado real

- [ ] Política de privacidad redactada y accesible — **no existe**, no evaluado si aplica para un sistema interno.
- [ ] Consentimiento explícito antes de recopilar datos — **no aplica en el sentido de la guía**: los nombres del equipo se extraen de documentos de sprint ya generados internamente (Linear/Markdown), no de un formulario de registro de usuarios.
- [ ] Proceso documentado para eliminar datos a solicitud — **no existe**, no evaluado si aplica.
- [x] Datos en tránsito cifrados — depende del deploy: en local (`http://localhost`) no hay TLS; en la URL pública que se defina para n8n (ver `PLAN-N8N-SPRINT-WORKFLOW.md`), debe usarse HTTPS (lo provee típicamente el túnel/proveedor de deploy, no el código de este proyecto).
- [ ] Datos sensibles en reposo cifrados — **no aplica directamente**: no hay base de datos que persista datos en reposo.
- [ ] Proceso de notificación de brechas — **no existe**.
- [ ] Retención mínima necesaria — **no definida** (ver tabla de arriba).

## Responsable

**No asignado.** La guía interna exige nombrar un responsable de compliance por normativa aplicable — este documento deja el punto abierto explícitamente en vez de inventar un responsable, porque es una decisión organizacional de Polaria, no técnica.

## Conclusión de esta evaluación preliminar

Ninguna de las áreas evaluadas indica una obligación regulatoria clara y urgente para el estado actual del proyecto (herramienta interna, sin base de datos, sin clientes externos, sin datos financieros/de salud). El punto que más vale la pena que el equipo confirme formalmente es el tratamiento de nombres del equipo en los reportes de sprint — no porque haya evidencia de riesgo, sino porque la guía interna pide no asumir "no aplica" sin hacer la evaluación explícita, y esa confirmación final es de alcance legal/organizacional, no técnico.
