import { describe, expect, it } from "vitest";

import {
  eastmoneySecidFromAStockCode,
  normalizeAStockCode,
  normalizeEastmoneyQuote,
  normalizeTushareDailyRows,
  normalizeTushareStockBasicRows
} from "@/lib/stocks/tushare";

describe("normalizeAStockCode", () => {
  it("adds SZ suffix for six-digit Shenzhen stock codes", () => {
    expect(normalizeAStockCode("000001")).toBe("000001.SZ");
  });

  it("adds SH suffix for six-digit Shanghai stock codes", () => {
    expect(normalizeAStockCode("600000")).toBe("600000.SH");
  });

  it("accepts an already suffixed A-share code and uppercases it", () => {
    expect(normalizeAStockCode("000001.sz")).toBe("000001.SZ");
  });

  it("rejects malformed stock codes", () => {
    expect(() => normalizeAStockCode("AAPL")).toThrow("请输入 6 位 A 股代码");
  });
});

describe("Tushare row normalization", () => {
  it("normalizes basic and daily rows into display-ready stock data", () => {
    const basicRows = normalizeTushareStockBasicRows(
      ["ts_code", "symbol", "name", "area", "industry", "market", "list_date"],
      [["000001.SZ", "000001", "平安银行", "深圳", "银行", "主板", "19910403"]]
    );
    const dailyRows = normalizeTushareDailyRows(
      ["ts_code", "trade_date", "open", "high", "low", "close", "pre_close", "change", "pct_chg", "vol", "amount"],
      [["000001.SZ", "20260519", 10.1, 10.5, 9.9, 10.3, 10, 0.3, 3, 120000, 123456]]
    );

    expect(basicRows[0]).toMatchObject({
      tsCode: "000001.SZ",
      name: "平安银行",
      industry: "银行"
    });
    expect(dailyRows[0]).toMatchObject({
      tsCode: "000001.SZ",
      tradeDate: "2026-05-19",
      close: 10.3,
      pctChg: 3
    });
  });
});

describe("Eastmoney quote metadata", () => {
  it("maps A-share stock codes to Eastmoney secid values", () => {
    expect(eastmoneySecidFromAStockCode("000001.SZ")).toBe("0.000001");
    expect(eastmoneySecidFromAStockCode("600000.SH")).toBe("1.600000");
  });

  it("extracts stock name from Eastmoney quote payload", () => {
    expect(
      normalizeEastmoneyQuote({
        data: {
          f57: "000001",
          f58: "平安银行"
        }
      })
    ).toEqual({
      symbol: "000001",
      name: "平安银行"
    });
  });
});
