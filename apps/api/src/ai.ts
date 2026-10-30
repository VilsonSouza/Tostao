import { config } from "./config.js";

/** Contrato único para qualquer provedor de IA (Gemini hoje, Claude em produção). */
export interface LlmClient {
  generate(system: string, user: string): Promise<string>;
}

const httpError = (statusCode: number, message: string) => Object.assign(new Error(message), { statusCode });

export class GeminiClient implements LlmClient {
  async generate(system: string, user: string): Promise<string> {
    if (!config.geminiApiKey) throw httpError(503, "GEMINI_API_KEY não configurada");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": config.geminiApiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
      }),
    });
    if (!res.ok) throw httpError(502, "Falha ao consultar a IA. Confira a chave e o modelo (GEMINI_MODEL).");
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
}
