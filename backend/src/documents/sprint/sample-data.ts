import { SprintData } from "./config";

export const sprintSampleData: SprintData = {
  sprintName: "1 JUNIO-JULIO 2026",
  dateStart: "Jun 22",
  dateEnd: "Jun29",
  weekNumber: "1",
  estadoSprint: "CUMPLIDO",
  porcentajeCompletado: 100,
  horas: {
    segmentos: [
      { nombre: "Proyectos (3 objetivos)", horas: 109.3 },
      { nombre: "Reuniones", horas: 3.5 },
      { nombre: "Incidencias", horas: 7.2 },
      // { nombre: "Personalizaciones", horas: 0 }, // oculto temporalmente
      // { nombre: "Team building", horas: 0 }, // oculto temporalmente
    ],
  },
  members: [
    {
      name: "LUIS DANIEL CANTILLO OSPINO",
      initials: "LC",
      objetivo:
        "Luis levanto la base operativa de la nueva app web de Polaria version 2.0. Diseno el esquema de base de datos para bodegas, catalogos, ordenes y estado de almacen, y configuro el modelo multi-tenant con seguridad a nivel de fila en Supabase. En paralelo construyo el backend modular en NestJS, el modulo de autenticacion y avanzo en el shell multi-rol del frontend en Next.js, dejando la base lista para que el equipo conecte los modulos de compras y configuracion el proximo sprint.",
      projects: [
        {
          name: "Polaria App - Construir aplicación web v2.0",
          issues: [
            {
              title:
                "Esquema BD operativo V2 (bodegas, catálogos, órdenes, warehouse_state)",
              type: "Feature",
              priority: "High",
              status: "Done",
              agregado: false,
            },
            {
              title: "Configurar multi-tenant y RLS base en Supabase",
              type: "Feature",
              priority: "Medium",
              status: "Done",
              agregado: false,
            },
            {
              title:
                "Base frontend Next.js y shell multi-rol (dashboard + configurador)",
              type: "Feature",
              priority: "High",
              status: "Done",
              agregado: false,
            },
            {
              title:
                "Desarrollar módulo de autenticación para Polaria web v2.0",
              type: "Feature",
              priority: "High",
              status: "Done",
              agregado: false,
            },
            {
              title: "Base backend modular NestJS para Polaria web v2.0",
              type: "Feature",
              priority: "Medium",
              status: "Done",
              agregado: true,
            },
          ],
        },
      ],
    },
    {
      name: "Mauricio Jose Manjarres Duque",
      initials: "MM",
      objetivo:
        "Mauricio se enfoco en dejar listas las consultas deterministas de Mateo para Polaria y para el cliente TCI. Mapeo e integro las vistas de kardex, facturacion, ventas y compras revisando de cerca el flujo entre la inteligencia artificial y las herramientas conectadas. Construyo los casos de uso principales para los tres indicadores clave de cada cliente, validando que cada respuesta del asistente coincidiera con los datos reales antes de marcarlos como completados para el cierre del sprint.",
      projects: [
        {
          name: "Mateo - Desplegar consultas deterministas en Supabase",
          issues: [
            {
              title:
                "Mapeo e Integración de la Vista de Kardex y Facturación - Revisar Flujo IA/Tool",
              type: "Feature",
              priority: "High",
              status: "Done",
              agregado: false,
            },
            {
              title:
                "Construir Casos de Uso Mateo Polaria — Compras y Ventas (KPI1, KPI2 y KPI3)",
              type: "Feature",
              priority: "Medium",
              status: "Done",
              agregado: false,
            },
            {
              title:
                "Mapeo e Integración de Vistas de Ventas y Compras - Revisar Flujo IA/Tool",
              type: "Feature",
              priority: "High",
              status: "Todo",
              agregado: true,
            },
            {
              title: "Construir Casos de Uso Mateo TCI (KPI1, KPI2 y KPI3)",
              type: "Feature",
              priority: "Medium",
              status: "Done",
              agregado: false,
            },
          ],
        },
      ],
    },
    {
      name: "Daniel De Jesus Galvis Zambrano",
      initials: "DG",
      objetivo:
        "Daniel concentro su semana en preparar a Mateo Support para produccion sobre Supabase. Migro la base de datos operativa desde MySQL, construyo la infraestructura de RAG con pgvector y conecto el manual de usuario al flujo de consulta para que cada ticket se resuelva con contexto real antes de escalar. Tambien activo el manejador de errores en produccion, corrigio el identificador de numero telefonico y dejo resuelta la deuda tecnica que quedaba pendiente antes del despliegue de la version 1.2.0.",
      projects: [
        {
          name: "Mateo Support - Desplegar v1.2.0 en producción",
          issues: [
            {
              title:
                "MEJORA-004: Agregar discriminador channel a Verificar Usuario Registrado",
              type: "Improvement",
              priority: "Low",
              status: "Done",
              agregado: false,
            },
            {
              title: "Activar Error Handler de Mateo Support en producción",
              type: "Feature",
              priority: "High",
              status: "Done",
              agregado: false,
            },
            {
              title:
                "Conectar manual de usuario al flujo de consulta de Mateo Support",
              type: "Feature",
              priority: "High",
              status: "Done",
              agregado: false,
            },
            {
              title: "Consultar el manual antes de crear cada ticket",
              type: "Feature",
              priority: "High",
              status: "Done",
              agregado: false,
            },
            {
              title:
                'MEJORA-001: Cambiar sessionId a user_phone + timestamp para evitar colisión de contextos"',
              type: "Improvement",
              priority: "Medium",
              status: "Done",
              agregado: false,
            },
            {
              title:
                "MEJORA-002: Renombrar 3 nodos con nombres genéricos en Mateo Support",
              type: "Improvement",
              priority: "Medium",
              status: "Done",
              agregado: true,
            },
            {
              title:
                "MEJORA-003: Verificar y corregir Phone Number ID en Error Handler",
              type: "Improvement",
              priority: "High",
              status: "Done",
              agregado: false,
            },
            {
              title: "Resolver deuda técnica pre-producción de Mateo Support",
              type: "Improvement",
              priority: "Medium",
              status: "In Progress",
              agregado: false,
            },
            {
              title:
                "Validar RAG con queries de prueba antes de integrar a Mateo",
              type: "Feature",
              priority: "High",
              status: "Done",
              agregado: false,
            },
            {
              title: "Construir workflow de ingesta de documentos RAG en n8n",
              type: "Feature",
              priority: "High",
              status: "Done",
              agregado: false,
            },
            {
              title:
                "Crear infraestructura DB para RAG en Supabase (pgvector + tabla + función)",
              type: "Feature",
              priority: "High",
              status: "Done",
              agregado: true,
            },
            {
              title:
                "Migrar base de datos operativa de Mateo Support de MySQL a Supabase",
              type: "Feature",
              priority: "High",
              status: "Done",
              agregado: false,
            },
          ],
        },
      ],
    },
  ],
  equipo: {
    quien:
      "Equipo enfocado (3 personas) - Dani, Mauro y Lucho, un proyecto cada uno",
    cuando: "22 jun a 29 jun, 1 semana (7 dias)",
    donde: "Produccion, WhatsApp, Linear, clientes Mateo Support / Polaria",
    como: "NestJS, Supabase, n8n, Next.js, Linear",
  },
  riesgoTransversal: {
    texto:
      "La migracion de datos y los nuevos modulos web corren en paralelo sin ambiente de pruebas dedicado, lo que puede generar errores que solo se detecten en produccion.",
    mitigacion:
      "Validar cada entrega con datos reales antes de cerrarla y monitorear de cerca los primeros dias.",
  },
  desviaciones: {
    logrado:
      "El plan inicial se cumplio parcialmente: algunos issues planeados quedaron abiertos por mayor complejidad de la esperada, mientras el equipo sumo trabajo no previsto que surgio durante la semana.",
    motivo:
      "Los issues agregados respondieron a incidencias y pedidos que aparecieron en curso; los planeados sin cerrar pasan al siguiente sprint.",
  },
};
