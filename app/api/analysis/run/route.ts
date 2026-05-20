import { NextResponse } from "next/server";

import { createAnalysisRepository } from "@/lib/analysis/repository";
import { runStockAnalysis } from "@/lib/analysis/llm";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { NormalizedStockData, TushareEnvelope } from "@/lib/stocks/types";

type RequestBody = {
  stockCode?: string;
  rawData?: {
    basic: TushareEnvelope | null;
    daily: TushareEnvelope;
  };
  normalizedData?: NormalizedStockData;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    if (!body.stockCode || !body.rawData || !body.normalizedData) {
      return NextResponse.json({ error: "缺少股票代码或股票数据" }, { status: 400 });
    }

    const analysis = await runStockAnalysis(body.normalizedData);
    const repository = createAnalysisRepository(createServerSupabaseClient());
    const record = await repository.saveAnalysis({
      stockCode: body.stockCode,
      stockName: body.normalizedData.basic?.name,
      rawData: body.rawData,
      normalizedData: body.normalizedData,
      analysis
    });

    return NextResponse.json({ analysis, record });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 分析失败" },
      { status: 400 }
    );
  }
}
