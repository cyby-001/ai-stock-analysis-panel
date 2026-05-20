"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import type { AnalysisJson } from "@/lib/analysis/schema";
import type { AnalysisRecord } from "@/lib/analysis/repository";
import type { NormalizedStockData, TushareEnvelope } from "@/lib/stocks/types";

type StockFetchResponse = {
  code: string;
  raw: {
    basic: TushareEnvelope;
    daily: TushareEnvelope;
  };
  normalized: NormalizedStockData;
};

const sentimentLabels: Record<AnalysisJson["sentiment"], string> = {
  bullish: "偏多",
  neutral: "中性",
  bearish: "偏空"
};

const riskLabels: Record<AnalysisJson["risk_level"], string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险"
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "请求失败");
  }
  return payload as T;
}

export default function Home() {
  const [stockCode, setStockCode] = useState("000001");
  const [stockData, setStockData] = useState<StockFetchResponse | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisJson | null>(null);
  const [recent, setRecent] = useState<AnalysisRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latest = stockData?.normalized.latestDaily;
  const basic = stockData?.normalized.basic;
  const canAnalyze = Boolean(stockData && !loadingAnalysis);
  const stockTitle = basic?.name ?? stockData?.code ?? "等待输入股票代码";

  const latestPriceText = useMemo(() => {
    if (!latest?.close) {
      return "--";
    }
    return latest.close.toFixed(2);
  }, [latest]);

  async function loadRecent() {
    try {
      const payload = await requestJson<{ records: AnalysisRecord[] }>("/api/analysis/recent");
      setRecent(payload.records);
    } catch {
      setRecent([]);
    }
  }

  useEffect(() => {
    void loadRecent();
  }, []);

  async function handleFetch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setAnalysis(null);
    setLoadingData(true);

    try {
      const payload = await requestJson<StockFetchResponse>("/api/stocks/fetch", {
        method: "POST",
        body: JSON.stringify({ stockCode })
      });
      setStockData(payload);
    } catch (fetchError) {
      setStockData(null);
      setError(fetchError instanceof Error ? fetchError.message : "获取股票数据失败");
    } finally {
      setLoadingData(false);
    }
  }

  async function handleAnalyze() {
    if (!stockData) {
      return;
    }

    setError(null);
    setLoadingAnalysis(true);

    try {
      const payload = await requestJson<{ analysis: AnalysisJson }>("/api/analysis/run", {
        method: "POST",
        body: JSON.stringify({
          stockCode: stockData.code,
          rawData: stockData.raw,
          normalizedData: stockData.normalized
        })
      });
      setAnalysis(payload.analysis);
      await loadRecent();
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "AI 分析失败");
    } finally {
      setLoadingAnalysis(false);
    }
  }

  return (
    <main className="shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">A 股研究辅助</p>
            <h1>AI 股票分析面板</h1>
          </div>
        </header>

        <form className="search-row" onSubmit={handleFetch}>
          <label htmlFor="stockCode">股票代码</label>
          <input
            id="stockCode"
            value={stockCode}
            placeholder="000001 或 600000.SH"
            onChange={(event) => setStockCode(event.target.value)}
          />
          <button disabled={loadingData} type="submit">
            {loadingData ? "获取中..." : "获取数据"}
          </button>
          <button disabled={!canAnalyze} type="button" className="secondary" onClick={handleAnalyze}>
            {loadingAnalysis ? "分析中..." : "AI 分析"}
          </button>
        </form>

        {error ? <div className="error">{error}</div> : null}

        <section className="grid">
          <div className="panel market-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">数据概览</p>
                <h2>{stockTitle}</h2>
              </div>
              <span>{stockData?.code ?? "--"}</span>
            </div>

            <div className="quote-line">
              <strong>{latestPriceText}</strong>
              <span className={latest?.pctChg && latest.pctChg < 0 ? "down" : "up"}>
                {latest?.pctChg === undefined ? "--" : `${latest.pctChg.toFixed(2)}%`}
              </span>
            </div>

            <dl className="metrics">
              <div>
                <dt>交易日</dt>
                <dd>{latest?.tradeDate ?? "--"}</dd>
              </div>
              <div>
                <dt>昨收</dt>
                <dd>{latest?.preClose?.toFixed(2) ?? "--"}</dd>
              </div>
              <div>
                <dt>开盘</dt>
                <dd>{latest?.open?.toFixed(2) ?? "--"}</dd>
              </div>
              <div>
                <dt>最高 / 最低</dt>
                <dd>
                  {latest?.high?.toFixed(2) ?? "--"} / {latest?.low?.toFixed(2) ?? "--"}
                </dd>
              </div>
              <div>
                <dt>涨跌额</dt>
                <dd>{latest?.change?.toFixed(2) ?? "--"}</dd>
              </div>
              <div>
                <dt>成交量 / 成交额</dt>
                <dd>
                  {latest?.volume?.toLocaleString("zh-CN") ?? "--"} / {latest?.amount?.toLocaleString("zh-CN") ?? "--"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="panel analysis-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">AI 分析</p>
                <h2>{analysis ? sentimentLabels[analysis.sentiment] : "尚未分析"}</h2>
              </div>
              <span>{analysis ? riskLabels[analysis.risk_level] : "--"}</span>
            </div>

            <p className="summary">{analysis?.summary ?? "获取股票数据后点击 AI 分析，系统会返回结构化 JSON 并保存到 Supabase。"}</p>

            <div className="list-columns">
              <div>
                <h3>关键因素</h3>
                <ul>
                  {(analysis?.key_factors.length ? analysis.key_factors : ["--"]).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>主要风险</h3>
                <ul>
                  {(analysis?.risks.length ? analysis.risks : ["--"]).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="confidence">
              <span>置信度</span>
              <strong>{analysis ? `${analysis.confidence}%` : "--"}</strong>
            </div>
          </div>
        </section>

        <section className="panel recent-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Tushare daily</p>
              <h2>近期日线数据</h2>
            </div>
            <span>{stockData ? `${stockData.normalized.dailyQuotes.length} 条` : "--"}</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>交易日</th>
                  <th>开盘</th>
                  <th>最高</th>
                  <th>最低</th>
                  <th>收盘</th>
                  <th>昨收</th>
                  <th>涨跌额</th>
                  <th>涨跌幅</th>
                  <th>成交量</th>
                  <th>成交额</th>
                </tr>
              </thead>
              <tbody>
                {stockData?.normalized.dailyQuotes.length ? (
                  stockData.normalized.dailyQuotes.map((quote) => (
                    <tr key={`${quote.tsCode}-${quote.tradeDate}`}>
                      <td>{quote.tradeDate}</td>
                      <td>{quote.open?.toFixed(2) ?? "--"}</td>
                      <td>{quote.high?.toFixed(2) ?? "--"}</td>
                      <td>{quote.low?.toFixed(2) ?? "--"}</td>
                      <td>{quote.close?.toFixed(2) ?? "--"}</td>
                      <td>{quote.preClose?.toFixed(2) ?? "--"}</td>
                      <td className={quote.change && quote.change < 0 ? "down-text" : "up-text"}>
                        {quote.change?.toFixed(2) ?? "--"}
                      </td>
                      <td className={quote.pctChg && quote.pctChg < 0 ? "down-text" : "up-text"}>
                        {quote.pctChg === undefined ? "--" : `${quote.pctChg.toFixed(2)}%`}
                      </td>
                      <td>{quote.volume?.toLocaleString("zh-CN") ?? "--"}</td>
                      <td>{quote.amount?.toLocaleString("zh-CN") ?? "--"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10}>获取数据后显示 Tushare daily 返回的全部字段</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel recent-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Supabase</p>
              <h2>最近分析记录</h2>
            </div>
            <button className="secondary compact" type="button" onClick={loadRecent}>
              刷新
            </button>
          </div>

          <div className="recent-list">
            {recent.length === 0 ? (
              <p className="empty">暂无记录</p>
            ) : (
              recent.map((record) => (
                <article key={record.id} className="recent-item">
                  <div>
                    <strong>{record.stock_name || record.stock_code}</strong>
                    <span>{record.stock_code}</span>
                  </div>
                  <div>
                    <span>{sentimentLabels[record.analysis.sentiment]}</span>
                    <span>{riskLabels[record.analysis.risk_level]}</span>
                    <time>{new Date(record.created_at).toLocaleString("zh-CN")}</time>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
