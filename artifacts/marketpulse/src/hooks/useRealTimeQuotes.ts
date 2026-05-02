import { useEffect, useRef, useCallback } from 'react';

export type QuoteResult = {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  currency: string | null;
  shortName: string | null;
  volume: number | null;
  trailingPE: number | null;
  error?: boolean;
};

type QuotesResponse = { quotes: QuoteResult[]; fetchedAt: string };

// Static mapping: marketId:ourSym → yahooSym for default watchlist stocks
export const DEFAULT_YAHOO_SYMBOLS: Record<string, Record<string, string>> = {
  IN: {
    RELIANCE:'RELIANCE.NS', TCS:'TCS.NS', HDFCBANK:'HDFCBANK.NS', INFY:'INFY.NS',
    ICICIBANK:'ICICIBANK.NS', WIPRO:'WIPRO.NS', BAJFINANCE:'BAJFINANCE.NS', SBIN:'SBIN.NS',
  },
  US: {
    AAPL:'AAPL', TSLA:'TSLA', NVDA:'NVDA', MSFT:'MSFT',
    AMZN:'AMZN', META:'META', GOOGL:'GOOGL', JPM:'JPM',
  },
  CN: {
    BABA:'BABA', TCEHY:'TCEHY', BYDDF:'BYDDF', PDD:'PDD',
    NIO:'NIO', XPEV:'XPEV', BIDU:'BIDU', JD:'JD',
  },
  JP: {
    '7203.T':'7203.T', '6758.T':'6758.T', '9984.T':'9984.T', '7974.T':'7974.T',
    '7267.T':'7267.T', '8058.T':'8058.T', '6752.T':'6752.T', '9432.T':'9432.T',
  },
  CMDTY: {
    GOLD:'GC=F', SILVER:'SI=F', OIL_WTI:'CL=F', OIL_BRENT:'BZ=F',
    NAT_GAS:'NG=F', COPPER:'HG=F',
  },
};

export const INDEX_SYMBOLS: Record<string, string[]> = {
  IN: ['^NSEI', '^BSESN', '^NSEBANK', '^CNXIT'],
  US: ['^GSPC', '^IXIC', '^DJI', '^RUT'],
  CN: ['000001.SS', '399001.SZ', '^HSI', '000300.SS'],
  JP: ['^N225', '^TOPX', '^NKY', '2038.T'],
  CMDTY: ['GC=F', 'CL=F', 'SI=F', 'NG=F'],
};

async function fetchQuotes(symbols: string[]): Promise<Record<string, QuoteResult>> {
  if (symbols.length === 0) return {};
  // Batch into chunks of 40 to avoid URL length limits
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 40) chunks.push(symbols.slice(i, i + 40));

  const allResults: Record<string, QuoteResult> = {};
  await Promise.allSettled(
    chunks.map(async chunk => {
      try {
        const res = await fetch(`/api/quotes?symbols=${chunk.join(',')}`);
        if (!res.ok) return;
        const data: QuotesResponse = await res.json();
        for (const q of data.quotes) allResults[q.symbol] = q;
      } catch { /* ignore */ }
    })
  );
  return allResults;
}

export function useRealTimeQuotes(
  // Dynamic symbol registry: marketId:ourSym → yahooSym
  watchlistSymbols: Record<string, string>,
  onUpdate: (quotes: Record<string, QuoteResult>, indexQuotes: Record<string, QuoteResult>) => void,
  intervalMs = 45000
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const watchlistRef = useRef(watchlistSymbols);
  watchlistRef.current = watchlistSymbols;

  const fetchAll = useCallback(async () => {
    const currentWatchlist = watchlistRef.current;
    const stockYahooSyms = [...new Set(Object.values(currentWatchlist))];
    const allIndexSyms = Object.values(INDEX_SYMBOLS).flat();
    const allSyms = [...new Set([...stockYahooSyms, ...allIndexSyms])];

    const byYahoo = await fetchQuotes(allSyms);

    // Map back: "marketId:ourSym" → quote
    const stockMap: Record<string, QuoteResult> = {};
    for (const [key, yahooSym] of Object.entries(currentWatchlist)) {
      const q = byYahoo[yahooSym];
      if (q) stockMap[key] = q;
    }

    // Map indices: "marketId:i" → quote
    const indexMap: Record<string, QuoteResult> = {};
    for (const [mId, syms] of Object.entries(INDEX_SYMBOLS)) {
      syms.forEach((s, i) => {
        const q = byYahoo[s];
        if (q) indexMap[`${mId}:${i}`] = q;
      });
    }

    onUpdateRef.current(stockMap, indexMap);
  }, []);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(fetchAll, intervalMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchAll, intervalMs]);

  return fetchAll;
}
