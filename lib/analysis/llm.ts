import { extractJsonObject, parseAnalysisJson, type AnalysisJson } from "@/lib/analysis/schema";
import type { NormalizedStockData } from "@/lib/stocks/types";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const SYSTEM_PROMPT = `你是一个谨慎的 A 股研究助手。你只能基于用户提供的数据做研究辅助分析，不提供买入、卖出或持仓建议。你必须只返回严格 JSON，不要 Markdown，不要解释。JSON 字段必须是：summary, sentiment, risk_level, key_factors, risks, confidence。sentiment 只能是 bullish、neutral、bearish。risk_level 只能是 low、medium、high。confidence 是 0 到 100 的数字。`;

export async function runStockAnalysis(stockData: NormalizedStockData, fetchImpl: typeof fetch = fetch): Promise<AnalysisJson> {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("缺少 LLM_API_KEY 环境变量");
  }

  const response = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            instruction: "分析这只 A 股的近期表现、情绪倾向和风险等级。不要给出明确买入或卖出建议。",
            stockData
          })
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`LLM 请求失败：HTTP ${response.status}`);
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM 未返回分析内容");
  }

  return parseAnalysisJson(extractJsonObject(content));
}
