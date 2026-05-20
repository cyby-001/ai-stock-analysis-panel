import type { AnalysisJson } from "@/lib/analysis/schema";

export type AnalysisRecord = {
  id: string;
  stock_code: string;
  stock_name: string | null;
  raw_data: unknown;
  normalized_data: unknown;
  analysis: AnalysisJson;
  created_at: string;
};

export type SaveAnalysisInput = {
  stockCode: string;
  stockName?: string;
  rawData: unknown;
  normalizedData: unknown;
  analysis: AnalysisJson;
};

type SupabaseLike = {
  from: (table: string) => {
    insert: (value: Record<string, unknown>) => {
      select: () => {
        single: () => PromiseLike<{ data: unknown; error: { message: string } | null }>;
      };
    };
    select?: (columns: string) => {
      order: (column: string, options: { ascending: boolean }) => {
        limit: (count: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
      };
    };
  };
};

export function createAnalysisRepository(client: SupabaseLike) {
  return {
    async saveAnalysis(input: SaveAnalysisInput) {
      const { data, error } = await client
        .from("stock_analyses")
        .insert({
          stock_code: input.stockCode,
          stock_name: input.stockName ?? null,
          raw_data: input.rawData,
          normalized_data: input.normalizedData,
          analysis: input.analysis
        })
        .select()
        .single();

      if (error) {
        throw new Error(`保存分析记录失败：${error.message}`);
      }
      return data;
    },

    async listRecent(limit = 10): Promise<AnalysisRecord[]> {
      const query = client.from("stock_analyses").select;
      if (!query) {
        throw new Error("Supabase client does not support select");
      }

      const { data, error } = await query("*").order("created_at", { ascending: false }).limit(limit);
      if (error) {
        throw new Error(`读取最近分析失败：${error.message}`);
      }
      return (data ?? []) as AnalysisRecord[];
    }
  };
}
