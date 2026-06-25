import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { DocumentConfig } from "../../documents/types";
import { PRECIO_GPT4OMINI } from "../../constants";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface UsoTokens {
  modelo: string;
  tokensEntrada: number;
  tokensSalida: number;
  tokensTotal: number;
  costoEstimadoUsd: number;
}

export interface ResultadoExtraccion<T> {
  datos: T;
  uso: UsoTokens;
}

export async function extraer<T>(
  markdown: string,
  config: DocumentConfig<T>,
): Promise<ResultadoExtraccion<T>> {
  const completion = await openai.beta.chat.completions.parse({
    model: PRECIO_GPT4OMINI.modelo,
    temperature: 0.2,
    response_format: zodResponseFormat(config.schema, `${config.id}_schema`),
    messages: [
      { role: "system", content: config.systemPrompt },
      { role: "user", content: markdown },
    ],
  });

  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed) {
    throw new Error(`OpenAI no devolvio datos parseados para ${config.id}.`);
  }

  const tokensEntrada = completion.usage?.prompt_tokens ?? 0;
  const tokensSalida = completion.usage?.completion_tokens ?? 0;
  const tokensTotal =
    completion.usage?.total_tokens ?? tokensEntrada + tokensSalida;

  const costoEstimadoUsd =
    (tokensEntrada / 1_000_000) * PRECIO_GPT4OMINI.usdPorMillonEntrada +
    (tokensSalida / 1_000_000) * PRECIO_GPT4OMINI.usdPorMillonSalida;

  return {
    datos: parsed,
    uso: {
      modelo: PRECIO_GPT4OMINI.modelo,
      tokensEntrada,
      tokensSalida,
      tokensTotal,
      costoEstimadoUsd,
    },
  };
}
