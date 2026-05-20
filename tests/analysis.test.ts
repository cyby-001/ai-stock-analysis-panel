import { describe, expect, it } from "vitest";

import { extractJsonObject, parseAnalysisJson } from "@/lib/analysis/schema";

describe("parseAnalysisJson", () => {
  it("accepts the strict analysis JSON shape", () => {
    const parsed = parseAnalysisJson({
      summary: "公司短期趋势中性，需关注成交量变化。",
      sentiment: "neutral",
      risk_level: "medium",
      key_factors: ["成交量温和", "行业景气度稳定"],
      risks: ["估值波动"],
      confidence: 72
    });

    expect(parsed.sentiment).toBe("neutral");
    expect(parsed.risk_level).toBe("medium");
  });

  it("rejects invalid sentiment values", () => {
    expect(() =>
      parseAnalysisJson({
        summary: "bad",
        sentiment: "buy",
        risk_level: "medium"
      })
    ).toThrow("AI 返回的 JSON 结构不符合要求");
  });
});

describe("extractJsonObject", () => {
  it("extracts a JSON object from fenced model output", () => {
    const content = '```json\n{"summary":"ok","sentiment":"bullish","risk_level":"low"}\n```';

    expect(extractJsonObject(content)).toEqual({
      summary: "ok",
      sentiment: "bullish",
      risk_level: "low"
    });
  });
});
