import { z } from "zod";

export const analysisSchema = z.object({
  summary: z.string().min(1),
  sentiment: z.enum(["bullish", "neutral", "bearish"]),
  risk_level: z.enum(["low", "medium", "high"]),
  key_factors: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(100).default(50)
});

export type AnalysisJson = z.infer<typeof analysisSchema>;

export function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced?.[1] ?? trimmed;
  const firstBrace = jsonText.indexOf("{");
  const lastBrace = jsonText.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("AI 未返回 JSON 对象");
  }

  return JSON.parse(jsonText.slice(firstBrace, lastBrace + 1));
}

export function parseAnalysisJson(value: unknown): AnalysisJson {
  const result = analysisSchema.safeParse(value);
  if (!result.success) {
    throw new Error("AI 返回的 JSON 结构不符合要求");
  }
  return result.data;
}
