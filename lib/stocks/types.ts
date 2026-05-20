export type TushareTableResponse = {
  fields: string[];
  items: unknown[][];
};

export type TushareEnvelope = {
  request_id?: string;
  code: number;
  msg?: string;
  data?: TushareTableResponse;
};

export type StockBasic = {
  tsCode: string;
  symbol: string;
  name: string;
  area?: string;
  industry?: string;
  market?: string;
  listDate?: string;
};

export type DailyQuote = {
  tsCode: string;
  tradeDate: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  preClose?: number;
  change?: number;
  pctChg?: number;
  volume?: number;
  amount?: number;
};

export type NormalizedStockData = {
  code: string;
  basic?: StockBasic;
  latestDaily?: DailyQuote;
  dailyQuotes: DailyQuote[];
};

export type StockFetchResult = {
  code: string;
  raw: {
    basic: TushareEnvelope | null;
    daily: TushareEnvelope;
  };
  normalized: NormalizedStockData;
};
