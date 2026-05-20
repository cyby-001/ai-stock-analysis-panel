import { NextResponse } from "next/server";

import { fetchStockData } from "@/lib/stocks/tushare";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { stockCode?: string };
    if (!body.stockCode) {
      return NextResponse.json({ error: "请输入股票代码" }, { status: 400 });
    }

    const data = await fetchStockData(body.stockCode);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取股票数据失败" },
      { status: 400 }
    );
  }
}
