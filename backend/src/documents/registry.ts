import { epicaConfig } from "./epica/config";
import { sprintConfig } from "./sprint/config";
import { DocumentConfig } from "./types";

export const documentRegistry: Record<string, DocumentConfig<any>> = {
  [epicaConfig.id]: epicaConfig,
  [sprintConfig.id]: sprintConfig,
};

export function getDocumentConfig(docType: string): DocumentConfig<any> | null {
  return documentRegistry[docType] ?? null;
}
