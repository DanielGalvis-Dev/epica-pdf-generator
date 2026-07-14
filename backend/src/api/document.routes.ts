import { timingSafeEqual } from "crypto";
import { Router, Response, Request, NextFunction } from "express";
import { extraer } from "../core/ai/extractor.service";
import { generarHtml, generarPdf } from "../core/generators/pdf.generator";
import { getDocumentConfig, getDocumentSample } from "../documents/registry";

export const documentRouter = Router();

// Forma estandar de error para toda la API: pensada para que un workflow de
// automatizacion (n8n, etc.) la parsee sin ambiguedad. `message` es siempre un
// texto generico y estable (nunca err.message/stack crudo); el detalle real
// del error solo se loguea en servidor via console.error.
export type ErrorCode =
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "UPLOAD_ERROR"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR";

export interface ErrorResponseBody {
  success: false;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
): void {
  const body: ErrorResponseBody = { success: false, code, message };
  if (details !== undefined) {
    body.details = details;
  }
  res.status(status).json(body);
}

// Compara dos strings en tiempo constante (crypto.timingSafeEqual) para que la
// duracion de la comparacion no filtre por timing cuantos caracteres iniciales
// de la API key acertó un caller. timingSafeEqual tira si los buffers difieren
// en longitud, asi que ese caso se descarta antes, sin llamarla.
function compararEnTiempoConstante(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

// Middleware de autenticacion por API key, condicional: si la variable de
// entorno API_KEY no esta definida (uso local/frontend actual), no valida
// nada y deja pasar todo. Solo cuando una instancia expuesta publicamente
// define API_KEY en su .env, empieza a exigir el header X-API-Key en cada
// request. Pensado para proteger el backend completo (no un endpoint
// aislado) cuando se expone con una URL publica para que n8n lo llame.
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.API_KEY;
  if (!expected) {
    next();
    return;
  }

  const provided = req.header("X-API-Key");
  if (!provided || !compararEnTiempoConstante(provided, expected)) {
    sendError(res, 401, "UNAUTHORIZED", "API key invalida o faltante.");
    return;
  }

  next();
}

function getConfigOrRespond(docType: string, res: Response) {
  const config = getDocumentConfig(docType);
  if (!config) {
    sendError(res, 404, "NOT_FOUND", `Tipo de documento no registrado: ${docType}`);
    return null;
  }
  return config;
}

function getPayload(body: any) {
  return body?.datos ?? body;
}

function getPlantilla(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

documentRouter.get("/:docType/sample-preview", (req, res) => {
  try {
    const config = getConfigOrRespond(req.params.docType, res);
    if (!config) {
      return;
    }

    const sample = getDocumentSample(req.params.docType);
    if (!sample) {
      sendError(res, 404, "NOT_FOUND", `No hay datos de ejemplo para ${req.params.docType}.`);
      return;
    }

    const parsed = config.schema.parse(sample);
    const datos = config.componerDatos(parsed);
    const html = generarHtml(datos, config, getPlantilla(req.query.plantilla));
    // Exito = HTML crudo (lo consume un <iframe>/navegador), no se envuelve en JSON.
    res.type("html").send(html);
  } catch (err: any) {
    console.error(`Error en /api/${req.params.docType}/sample-preview:`, err);
    sendError(res, 500, "INTERNAL_ERROR", "Error al generar preview de ejemplo.");
  }
});

documentRouter.post("/:docType/extraer", async (req, res) => {
  try {
    const config = getConfigOrRespond(req.params.docType, res);
    if (!config) {
      return;
    }

    if (!req.file) {
      sendError(res, 400, "BAD_REQUEST", "No se recibio ningun archivo .md.");
      return;
    }

    const markdown = req.file.buffer.toString("utf-8");
    if (!markdown.trim()) {
      sendError(res, 400, "BAD_REQUEST", "El archivo esta vacio.");
      return;
    }

    const resultado = await extraer(markdown, config);
    // success: true se agrega de forma aditiva; `datos`/`uso` se mantienen tal
    // cual porque el frontend actual depende de esas claves en la raiz.
    res.json({ success: true, ...resultado });
  } catch (err: any) {
    console.error(`Error en /api/${req.params.docType}/extraer:`, err);
    sendError(res, 500, "INTERNAL_ERROR", "Error al extraer datos.");
  }
});

documentRouter.post("/:docType/preview", (req, res) => {
  try {
    const config = getConfigOrRespond(req.params.docType, res);
    if (!config) {
      return;
    }

    const parsed = config.schema.safeParse(getPayload(req.body));
    if (!parsed.success) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Datos invalidos para el documento solicitado.",
        parsed.error.flatten(),
      );
      return;
    }

    const datos = config.componerDatos(parsed.data);
    const html = generarHtml(datos, config, getPlantilla(req.body?.plantilla));
    // Exito = HTML crudo (lo consume un <iframe>/navegador), no se envuelve en JSON.
    res.type("html").send(html);
  } catch (err: any) {
    console.error(`Error en /api/${req.params.docType}/preview:`, err);
    sendError(res, 500, "INTERNAL_ERROR", "Error al generar preview.");
  }
});

documentRouter.post("/:docType/pdf", async (req, res) => {
  try {
    const config = getConfigOrRespond(req.params.docType, res);
    if (!config) {
      return;
    }

    const parsed = config.schema.safeParse(getPayload(req.body));
    if (!parsed.success) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Datos invalidos para el documento solicitado.",
        parsed.error.flatten(),
      );
      return;
    }

    const datos = config.componerDatos(parsed.data);
    const pdf = await generarPdf(datos, config, getPlantilla(req.body?.plantilla));
    const baseName = `${config.id}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, "_");

    // Exito = binario PDF (Content-Type: application/pdf), no se envuelve en JSON.
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${baseName}.pdf"`,
    );
    res.send(pdf);
  } catch (err: any) {
    console.error(`Error en /api/${req.params.docType}/pdf:`, err);
    sendError(res, 500, "INTERNAL_ERROR", "Error al generar PDF.");
  }
});
