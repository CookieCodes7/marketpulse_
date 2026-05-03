# MarketPulse

**MarketPulse** is a professional financial terminal built for traders and market watchers tracking India, the USA, China, and Japan from one interface.
It combines live stock data, AI-powered signals, portfolio analytics, market news, commodities, and a global market impact map inside a dark terminal-style UI.

## Highlights

- Real-time stock quotes with price, percentage change, volume, and market cap.
- Multi-market watchlists for NSE/BSE, NYSE/NASDAQ, SSE/SZSE, and TSE.
- AI signals for stocks with bullish, bearish, or neutral outlooks and target prices.
- Portfolio tracking with live P&L, allocation views, and AI-generated portfolio reports.
- Live market news with market-specific filters and article detail panels.
- Commodities tracking across metals, energy, and agriculture.
- Global market impact map with geopolitical risk overlays.
- Full English and Hindi UI with persistent language preference.

## Features

### Live Terminal

- Real-time stock quotes for multiple markets.
- Watchlists covering India, USA, China, and Japan.
- AI signals with confidence, direction, and target prices.
- Market session status: Pre-Open, Regular, After-Hours, or Closed.
- Scrolling indices ticker for quick market context.

### Stock Detail

- Interactive price chart with ranges: 1D, 1W, 1M, 3M, and 1Y.
- Full AI analysis including confidence score, target price, catalysts, risks, and sentiment.
- Per-stock news feed for fast research.

### Portfolio Tracker

- Add, edit, and remove holdings across supported markets.
- Live profit and loss table with day change, overall return, and allocation bars.
- Allocation donut charts by stock, market, and sector.
- Today's movers widget and portfolio-specific news.

### AI Portfolio Report

- Health score from 0 to 100 with color-coded status.
- Diversification verdict such as well diversified or concentrated risk.
- Risk level classification: Low, Medium, High, or Very High.
- Per-holding actions such as Buy More, Hold, Reduce, Sell, or Watch.
- Priority suggestions, risk alerts, and sector or market exposure breakdowns.

### News Feed

- Four-column article grid with thumbnails.
- Filters for All, India, USA, China, and Japan.
- Auto-refresh every 90 seconds with a countdown timer.
- Article detail panel with related ticker prices.

### Commodities

**Metals**
- Gold
- Silver
- Platinum
- Palladium
- Copper

**Energy**
- Crude Oil
- Natural Gas
- Brent
- Heating Oil
- Gasoline
- 
### World Map

- Geopolitical risk overlay with color-coded market sentiment.
- Live market impact visualization across major regions.

### Accessibility and Localization

- Full Hindi (हिंदी) translation across the interface.
- Language toggle available in every page header.
- Language preference persists across sessions.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 7 + TypeScript |
| Routing | Wouter |
| Backend | Express 5 + Node.js 24 |
| Market Data | yahoo-finance2 v3 |
| AI | OpenAI GPT-5.1 |
| Charts | Chart.js |
| Map | D3 + TopoJSON |
| Monorepo | pnpm workspaces |
| Fonts | IBM Plex Mono + Noto Sans Devanagari |
| Auth | localStorage with SHA-256 password hashing |

## Project Structure

```text
marketpulse/
├── artifacts/
│   ├── marketpulse/                  # React + Vite frontend (path: /)
│   │   └── src/
│   │       ├── pages/                # Terminal, LandingPage, NewsPage, PortfolioPage, CommoditiesPage
│   │       ├── components/           # Clock, WorldMap, ProfilePanel, LangToggle, ...
│   │       ├── context/              # AuthContext, LanguageContext
│   │       └── i18n/                 # translations.ts (EN + HI)
│   └── api-server/                   # Express backend (path: /api)
│       └── src/
│           └── routes/               # quotes, stock, news, portfolio, img proxy
└── pnpm-workspace.yaml
```

## Routes

### App Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/terminal` | Main watchlist terminal |
| `/stock/:symbol` | Stock detail with chart and AI analysis |
| `/portfolio` | Portfolio tracker with AI report |
| `/news` | Live market news feed |
| `/commodities` | Commodities dashboard |
| `/map` | Global market impact map |

### API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/quotes?symbols=` | Live quotes for multiple symbols |
| `GET` | `/api/stock/:symbol/detail` | Stock detail with related news |
| `GET` | `/api/stock/:symbol/history?range=` | OHLCV price history |
| `GET` | `/api/stock/:symbol/analysis` | AI analysis for a stock |
| `GET` | `/api/news?market=&limit=` | Market news feed |
| `GET` | `/api/img?url=` | Image proxy for news thumbnails |
| `POST` | `/api/portfolio/analysis` | Full AI portfolio report |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Install

```bash
pnpm install
```

### Run in Development

Start the API server:

```bash
pnpm --filter @workspace/api-server run dev
```

Start the frontend:

```bash
pnpm --filter @workspace/marketpulse run dev
```

## Scripts

### Build API

```bash
pnpm --filter @workspace/api-server run build
```

### Typecheck

```bash
pnpm run typecheck
```

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | API server port, default `8080` |
| `OPENAI_API_KEY` | OpenAI API key used for AI signals and portfolio analysis |

## Authentication

This project uses a client-side authentication flow based on `localStorage` with SHA-256 password hashing.
No backend database is required.

- Signup stores a new user with email and hashed password.
- Login validates known credentials and rejects invalid ones.
- Profile updates such as name and bio persist immediately.

## Internationalization

The UI supports both English and Hindi.
Translation keys are stored in `artifacts/marketpulse/src/i18n/translations.ts`.
The language toggle appears in every page header and remembers the user's choice.

## Notes

- The app is designed as a dark terminal-style experience for multi-market monitoring.
- Data is sourced through `yahoo-finance2` and enhanced with AI-driven analysis.
- Portfolio reports and stock analysis depend on a valid `OPENAI_API_KEY`.

## Built By

**Team Nexus**  
Jaipur, India · 2026
