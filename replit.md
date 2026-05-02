# MarketPulse Financial Terminal

## Overview

A professional financial terminal built as a pnpm workspace monorepo. Features real-time stock data, AI-powered analysis, portfolio tracking, live news feed, and a full Commodities market (Gold, Silver, Oil, Gas, Agriculture, and more).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifact: `marketpulse`, path `/`)
- **Backend**: Express 5 (artifact: `api-server`, path `/api`)
- **AI**: OpenAI GPT-5.1 via Replit AI Integrations
- **Market data**: yahoo-finance2 v3
- **Charts**: Chart.js
- **Routing**: Wouter
- **Font**: IBM Plex Mono

## Internationalization (i18n)

- **Languages**: English (EN) and Hindi (हिं)
- **Toggle**: `EN | हिं` pill button in every page header — persists to `localStorage` (`mp_lang`)
- **Translation files**: `src/i18n/translations.ts` — all 120+ UI string keys with EN/HI values
- **Context**: `src/context/LanguageContext.tsx` — `LanguageProvider` + `useLanguage()` hook returning `{ lang, setLang, t }`
- **Component**: `src/components/LangToggle.tsx` — drop-in pill toggle
- **Font**: Noto Sans Devanagari loaded via Google Fonts for correct Devanagari rendering
- **Coverage**: LandingPage (hero, nav, auth form), Terminal (watchlist, status, geo section, news panel), NewsPage, CommoditiesPage, PortfolioPage (header, summary, tabs), ProfilePanel (all labels, prefs, buttons)
- **Non-translated**: Stock names, company names, news article titles, AI-generated text, financial data

## Features

### Terminal (`/`)
- Live stock quotes with real-time price, change, volume
- Market session indicator (pre/regular/after/closed)
- Live AI signals (BULLISH/BEARISH/NEUTRAL) with target prices per stock
- Multi-market watchlists: India, USA, China, Japan
- Market indices bar

### Stock Detail (`/stock/:symbol`)
- Real price chart (1D/1W/1M/3M/1Y) via Chart.js
- Full AI analysis: signal, confidence, target price, catalysts, risks, sentiment
- News feed for the stock
- Related holdings link

### Portfolio (`/portfolio`)
- Add/remove/edit holdings (market selector + stock search)
- Live P&L table with day change, overall return, allocation bars
- Allocation donut chart (by stock/market/sector)
- Today's movers widget
- Portfolio-specific news
- **AI Analysis tab**: Full AI report via GPT-5.1
  - Health score (0–100) with color-coded circle
  - Verdict (Well Diversified / Concentrated Risk / etc.)
  - Risk level (LOW/MEDIUM/HIGH/VERY HIGH)
  - Per-holding recommendations (BUY_MORE/HOLD/REDUCE/SELL/WATCH)
  - Key suggestions with priority levels
  - Risk alerts
  - Sector & market exposure bars
  - Regenerate on demand
- Persists to localStorage (`marketpulse_portfolio_v1`)

### News Feed (`/news`)
- 4-column article grid with real thumbnails (served via image proxy)
- Market filters: All / India / USA / China / Japan
- Auto-refresh every 90s with countdown timer + manual refresh button
- Article detail panel with related ticker live prices
- Footer "Load Fresh News" button

## API Routes

- `GET /api/quotes?symbols=` — live quotes for multiple symbols
- `GET /api/stock/:symbol/detail` — full stock detail + news
- `GET /api/stock/:symbol/history?range=` — OHLCV price history
- `GET /api/stock/:symbol/analysis` — single-stock AI analysis
- `GET /api/news?market=&limit=` — market news feed
- `GET /api/img?url=` — image proxy (resolves 140px Yahoo thumbnails to originals)
- `POST /api/portfolio/analysis` — full AI portfolio report

## Key Implementation Notes

- `yahoo-finance2` v3: use `getYF()` from `lib/yf.ts`. Pass modules object without `validateResult`. `providerPublishTime` is Unix seconds — convert with `t < 1e12 ? t * 1000 : t`.
- OpenAI: model `gpt-5.1`. Strip markdown fences before JSON.parse. No `temperature` param.
- News thumbnails: Yahoo serves 140×140px CDN URLs. Backend extracts original source URL (`media.zenfs.com` etc.) then proxies via `/api/img` with `Referer: finance.yahoo.com`.
- API server must be rebuilt (`pnpm run build`) and restarted after every change.
- Pre-existing TS errors in `WorldMap.tsx` (topojson types) — safe to ignore.

## Key Commands

- `pnpm run typecheck` — full typecheck
- `pnpm --filter @workspace/api-server run build` — rebuild API
- `pnpm --filter @workspace/marketpulse run dev` — run frontend

## Route Structure

```
/              Terminal (main watchlist)
/map           World Map
/stock/:symbol Stock detail page
/portfolio     Portfolio tracker + AI analysis
/news          News feed
```
