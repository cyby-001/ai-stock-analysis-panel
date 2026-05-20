# AI 股票分析面板

一个 Next.js 全栈单体应用：输入 A 股股票代码，调用 Tushare 获取数据，再调用 OpenAI-compatible LLM 返回严格 JSON 分析，并把原始数据和分析结果保存到 Supabase。

## 功能

- A 股代码标准化：支持 `000001`、`600000`、`000001.SZ` 等输入。
- Tushare 数据获取：近期非复权日线行情，适配 120 积分免费账号。
- 股票名称兜底：使用免登录行情元数据接口补齐名称，失败时仍可显示股票代码。
- AI 分析：返回 `summary`、`sentiment`、`risk_level`、`key_factors`、`risks`、`confidence`。
- Supabase 存储：保存原始 Tushare 响应、标准化数据和 AI JSON。
- 单页面板：数据概览、AI 分析结果和最近分析记录。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

在 `.env.local` 中填入：

```bash
TUSHARE_TOKEN=your_tushare_token
LLM_API_KEY=your_llm_api_key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_or_secret_key
```

## Tushare 权限说明

120 积分账号默认只能调用 `daily` 股票非复权日线行情。本项目第一版默认只用 Tushare 调用 `daily`，不会调用 `stock_basic`、`daily_basic` 等更高积分接口。行业、上市日期这类字段需要更高权限接口，因此页面改为展示昨收、涨跌额、成交量、成交额等日线指标。

## Supabase 建表

`SUPABASE_SERVICE_ROLE_KEY` 必须填 Supabase 后台的 service role/secret key，不能填 `sb_publishable...` 或 anon public key。这个 key 只在服务端使用，不要暴露到浏览器。

在 Supabase SQL Editor 中执行：

```sql
create extension if not exists "pgcrypto";

create table if not exists public.stock_analyses (
  id uuid primary key default gen_random_uuid(),
  stock_code text not null,
  stock_name text,
  raw_data jsonb not null,
  normalized_data jsonb not null,
  analysis jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists stock_analyses_created_at_idx
  on public.stock_analyses (created_at desc);

create index if not exists stock_analyses_stock_code_idx
  on public.stock_analyses (stock_code);
```

## Render 部署

1. 推送项目到 GitHub。
2. 在 Render 新建 Web Service，连接该仓库。
3. 设置：
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. 在 Render Environment 中配置 `.env.example` 中的所有变量。

## 测试

```bash
npm test
npm run build
```

AI 分析仅用于研究辅助，不提供明确买入或卖出建议。
