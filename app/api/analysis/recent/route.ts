import { NextResponse } from "next/server";

import { createAnalysisRepository } from "@/lib/analysis/repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const repository = createAnalysisRepository(createServerSupabaseClient());
    const records = await repository.listRecent(10);
    return NextResponse.json({ records });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取最近分析失败" },
      { status: 400 }
    );
  }
}
