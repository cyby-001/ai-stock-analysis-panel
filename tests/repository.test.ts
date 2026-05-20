import { describe, expect, it, vi } from "vitest";

import { createAnalysisRepository } from "@/lib/analysis/repository";

describe("analysis repository", () => {
  it("inserts successful analysis records with raw and normalized data", async () => {
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "row-1", stock_code: "000001.SZ" },
          error: null
        })
      })
    });
    const repo = createAnalysisRepository({ from: () => ({ insert }) });

    const result = await repo.saveAnalysis({
      stockCode: "000001.SZ",
      stockName: "平安银行",
      rawData: { basic: [] },
      normalizedData: { tsCode: "000001.SZ" },
      analysis: {
        summary: "中性",
        sentiment: "neutral",
        risk_level: "medium",
        key_factors: [],
        risks: [],
        confidence: 60
      }
    });

    expect(result).toEqual({ id: "row-1", stock_code: "000001.SZ" });
    expect(insert).toHaveBeenCalledWith({
      stock_code: "000001.SZ",
      stock_name: "平安银行",
      raw_data: { basic: [] },
      normalized_data: { tsCode: "000001.SZ" },
      analysis: {
        summary: "中性",
        sentiment: "neutral",
        risk_level: "medium",
        key_factors: [],
        risks: [],
        confidence: 60
      }
    });
  });
});
