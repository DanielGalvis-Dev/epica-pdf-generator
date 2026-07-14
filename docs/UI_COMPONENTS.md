# Storybook o catálogo de componentes UI

**Prioridad: Baja. Estado: No aplica.**

## Por qué no aplica

Storybook (y cualquier catálogo de componentes aislados) documenta **componentes de un framework de UI** (React, Vue, etc.) con props tipadas, múltiples estados visuales y stories ejecutables. Este proyecto no tiene ese tipo de frontend:

- `frontend/index.html` es un **único archivo estático**, HTML + JavaScript vanilla + Tailwind vía CDN, **sin build step y sin framework de componentes** (ver `CLAUDE.md`: "El frontend es un único `frontend/index.html` estático... sin build step").
- No hay una carpeta `components/`, no hay JSX/TSX, no hay props tipadas que documentar — el "componente" más cercano que existe es el objeto `DOCUMENTS` dentro del `<script>` de `index.html`, que es configuración de datos (labels, plantillas por tipo de documento), no un componente de UI reusable con estados visuales independientes.
- Las plantillas Handlebars (`template*.html` dentro de `backend/src/documents/<tipo>/`) tampoco son "componentes de UI" en el sentido de Storybook: son plantillas de servidor que se renderizan una sola vez a HTML/PDF, no se montan ni interactúan en un navegador con estados como hover/focus/loading.

## Qué existe en su lugar

- `docs/API.md` documenta el contrato de cada endpoint (incluye `sample-preview`, que es la forma real de "ver" cómo se ve una plantilla sin generar el PDF completo — el equivalente más cercano a una "story" que tiene este proyecto).
- Si en el futuro el frontend crece hacia un framework de componentes (React, Vue, etc.), este documento debe reemplazarse por uno real siguiendo el punto 19 de `GUIA_DOCUMENTACION_EXTENDIDA.md` — la propia guía advierte que Storybook "tiene un costo de mantenimiento" y que para equipos pequeños en etapa temprana suele ser más valioso invertir ese tiempo en tests o en documentar flujos de negocio (ver `docs/TESTING.md` y `docs/BUSINESS_FLOWS.md`), que es lo que se priorizó acá.
