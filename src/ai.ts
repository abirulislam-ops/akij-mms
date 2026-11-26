import OpenAI from "openai";
import { env } from "./env.js";

// Neon AI Gateway is OpenAI-compatible — change only the base URL + token.
export function createAiClient(): OpenAI {
  // OpenAI SDK expects baseURL to include the `/v1` path.
  const base = (env.aiGatewayBaseUrl ?? "").replace(/\/+$/, "");
  return new OpenAI({
    baseURL: `${base}/v1`,
    apiKey: env.aiGatewayToken,
  });
}

export async function listModels(): Promise<string[]> {
  const client = createAiClient();
  const res = await client.models.list();
  return res.data.map((m) => m.id);
}
