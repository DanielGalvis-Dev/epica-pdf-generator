import { EpicaData } from "./config";

export const epicaSampleData: EpicaData = {
  periodo: "JUNIO-JULIO",
  fechaInicio: "22 JUN",
  fechaFin: "20 JUL",
  duracion: "4 SEMANAS",
  epicas: [
    {
      nombreCorto: "Bodega Fria v2.0",
      subtitulo: "MIGRACION A SAAS",
      responsable: "LUCHO",
      objetivo:
        "Centralizar la operacion de bodega fria para que cada cliente trabaje con informacion clara, separada y disponible durante el mes.",
      alcance:
        "Gestion de inventario, movimientos principales, permisos por cliente y reportes operativos para seguimiento diario.",
      kpis: ["6/6 VISTAS", ">90% PRECISION", "<5S RESPUESTA"],
      resultadoEsperado:
        "El equipo opera la bodega desde un flujo unico, con menos reprocesos y mejor visibilidad para clientes.",
      riesgo:
        "La migracion puede exponer diferencias entre reglas actuales y el nuevo flujo si no se valida con usuarios reales.",
    },
  ],
  equipo: {
    quien: "Equipo enfocado en la entrega principal del periodo",
    cuando: "22 jun a 20 jul, 4 semanas",
    donde: "Produccion, clientes internos, Linear y canales de soporte",
    como: "Node.js, servicios backend, base de datos y automatizaciones",
  },
  riesgoTransversal: {
    texto:
      "El mayor riesgo es que validaciones tardias cambien el alcance y obliguen a ajustar entregables ya integrados.",
    mitigacion:
      "Cerrar criterios por epica, revisar avances semanalmente y validar casos criticos antes del cierre.",
  },
};
