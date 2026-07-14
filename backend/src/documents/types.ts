import { z } from "zod";

export interface DocumentTemplate {
  path: string;
  pdf?: {
    width: string;
    height: string;
  };
}

export interface DocumentConfig<T> {
  id: string;
  schema: z.ZodSchema<T>;
  systemPrompt: string;
  componerDatos(datosExtraidos: T): any;
  templates: Record<string, DocumentTemplate>;
  defaultTemplate: string;
}
