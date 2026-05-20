import type {
  DailyQuote,
  NormalizedStockData,
  StockBasic,
  StockFetchResult,
  TushareEnvelope,
  TushareTableResponse
} from "@/lib/stocks/types";

const TUSHARE_URL = "https://api.tushare.pro";
const EASTMONEY_QUOTE_URL = "https://push2.eastmoney.com/api/qt/stock/get";

function compactDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
}

function dashedDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{8}$/.test(value)) {
    return undefined;
  }
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function tableRows(fields: string[], items: unknown[][]): Array<Record<string, unknown>> {
  return items.map((item) =>
    fields.reduce<Record<string, unknown>>((row, field, index) => {
      row[field] = item[index];
      return row;
    }, {})
  );
}

export function normalizeAStockCode(input: string): string {
  const value = input.trim().toUpperCase();
  const suffixed = value.match(/^(\d{6})\.(SH|SZ|BJ)$/);
  if (suffixed) {
    return `${suffixed[1]}.${suffixed[2]}`;
  }

  if (!/^\d{6}$/.test(value)) {
    throw new Error("请输入 6 位 A 股代码，例如 000001 或 600000");
  }

  if (value.startsWith("6")) {
    return `${value}.SH`;
  }
  if (value.startsWith("0") || value.startsWith("3")) {
    return `${value}.SZ`;
  }
  if (value.startsWith("4") || value.startsWith("8")) {
    return `${value}.BJ`;
  }

  throw new Error("暂不支持该股票代码前缀，请输入有效 A 股代码");
}

export function normalizeTushareStockBasicRows(fields: string[], items: unknown[][]): StockBasic[] {
  return tableRows(fields, items).map((row) => ({
    tsCode: String(row.ts_code ?? ""),
    symbol: String(row.symbol ?? ""),
    name: String(row.name ?? ""),
    area: typeof row.area === "string" ? row.area : undefined,
    industry: typeof row.industry === "string" ? row.industry : undefined,
    market: typeof row.market === "string" ? row.market : undefined,
    listDate: dashedDate(row.list_date)
  }));
}

export function normalizeTushareDailyRows(fields: string[], items: unknown[][]): DailyQuote[] {
  return tableRows(fields, items).map((row) => ({
    tsCode: String(row.ts_code ?? ""),
    tradeDate: dashedDate(row.trade_date) ?? String(row.trade_date ?? ""),
    open: asNumber(row.open),
    high: asNumber(row.high),
    low: asNumber(row.low),
    close: asNumber(row.close),
    preClose: asNumber(row.pre_close),
    change: asNumber(row.change),
    pctChg: asNumber(row.pct_chg),
    volume: asNumber(row.vol),
    amount: asNumber(row.amount)
  }));
}

export function eastmoneySecidFromAStockCode(stockCode: string): string {
  const code = normalizeAStockCode(stockCode);
  const [symbol, exchange] = code.split(".");
  return `${exchange === "SH" ? "1" : "0"}.${symbol}`;
}

export function normalizeEastmoneyQuote(payload: unknown): Pick<StockBasic, "symbol" | "name"> | undefined {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const symbol = data?.f57;
  const name = data?.f58;

  if (typeof symbol !== "string" || typeof name !== "string" || !name.trim()) {
    return undefined;
  }

  return {
    symbol,
    name
  };
}

async function fetchPublicStockMetadata(stockCode: string, fetchImpl: typeof fetch = fetch): Promise<StockBasic | undefined> {
  const code = normalizeAStockCode(stockCode);
  const url = new URL(EASTMONEY_QUOTE_URL);
  url.searchParams.set("secid", eastmoneySecidFromAStockCode(code));
  url.searchParams.set("fields", "f57,f58");

  try {
    const response = await fetchImpl(url, {
      headers: {
        Referer: "https://quote.eastmoney.com/"
      }
    });
    if (!response.ok) {
      return undefined;
    }

    const quote = normalizeEastmoneyQuote(await response.json());
    if (!quote) {
      return undefined;
    }

    return {
      tsCode: code,
      symbol: quote.symbol,
      name: quote.name
    };
  } catch {
    return undefined;
  }
}

async function callTushare(
  apiName: string,
  params: Record<string, unknown>,
  fields: string,
  fetchImpl: typeof fetch = fetch
): Promise<TushareEnvelope> {
  const token = process.env.TUSHARE_TOKEN;
  if (!token) {
    throw new Error("缺少 TUSHARE_TOKEN 环境变量");
  }

  const response = await fetchImpl(TUSHARE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_name: apiName,
      token,
      params,
      fields
    })
  });

  if (!response.ok) {
    throw new Error(`Tushare 请求失败：HTTP ${response.status}`);
  }

  const payload = (await response.json()) as TushareEnvelope;
  if (payload.code !== 0) {
    throw new Error(payload.msg || `Tushare 返回错误码 ${payload.code}`);
  }
  return payload;
}

function normalizeStockData(code: string, basic?: TushareTableResponse, daily?: TushareTableResponse): NormalizedStockData {
  const basicRows = basic ? normalizeTushareStockBasicRows(basic.fields, basic.items) : [];
  const dailyQuotes = daily ? normalizeTushareDailyRows(daily.fields, daily.items) : [];

  return {
    code,
    basic: basicRows[0],
    latestDaily: dailyQuotes[0],
    dailyQuotes
  };
}

export async function fetchStockData(stockCode: string, fetchImpl: typeof fetch = fetch): Promise<StockFetchResult> {
  const code = normalizeAStockCode(stockCode);
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 45);

  const [metadata, daily] = await Promise.all([
    fetchPublicStockMetadata(code, fetchImpl),
    callTushare(
    "daily",
    { ts_code: code, start_date: compactDate(start), end_date: compactDate(end) },
    "ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,vol,amount",
    fetchImpl
    )
  ]);

  const normalized = normalizeStockData(code, undefined, daily.data);
  normalized.basic = metadata;
  if (!normalized.basic && normalized.dailyQuotes.length === 0) {
    throw new Error("未找到该股票的数据，请检查股票代码");
  }

  return {
    code,
    raw: { basic: null, daily },
    normalized
  };
}
