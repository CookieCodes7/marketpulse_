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

export const YAHOO_SYMBOLS: Record<string, Record<string, string>> = {
  IN: {
    RELIANCE:   'RELIANCE.NS',
    TCS:        'TCS.NS',
    HDFCBANK:   'HDFCBANK.NS',
    INFY:       'INFY.NS',
    ICICIBANK:  'ICICIBANK.NS',
    WIPRO:      'WIPRO.NS',
    BAJFINANCE: 'BAJFINANCE.NS',
    SBIN:       'SBIN.NS',
  },
  US: {
    AAPL:  'AAPL',
    TSLA:  'TSLA',
    NVDA:  'NVDA',
    MSFT:  'MSFT',
    AMZN:  'AMZN',
    META:  'META',
    GOOGL: 'GOOGL',
    JPM:   'JPM',
  },
  CN: {
    BABA:  'BABA',
    TCEHY: 'TCEHY',
    BYDDF: 'BYDDF',
    PDD:   'PDD',
    NIO:   'NIO',
    XPEV:  'XPEV',
    BIDU:  'BIDU',
    JD:    'JD',
  },
  JP: {
    '7203.T': '7203.T',
    '6758.T': '6758.T',
    '9984.T': '9984.T',
    '7974.T': '7974.T',
    '7267.T': '7267.T',
    '8058.T': '8058.T',
    '6752.T': '6752.T',
    '9432.T': '9432.T',
  },
};

export const INDEX_SYMBOLS: Record<string, string[]> = {
  IN: ['^NSEI', '^BSESN', '^NSEBANK', '^CNXIT'],
  US: ['^GSPC', '^IXIC', '^DJI', '^RUT'],
  CN: ['000001.SS', '399001.SZ', '^HSI', '000300.SS'],
  JP: ['^N225', '^TOPX', '^NKY', '2038.T'],
};

export function useRealTimeQuotes(
  onUpdate: (quotes: Record<string, QuoteResult>, indexQuotes: Record<string, QuoteResult>) => void,
  intervalMs = 45000
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const fetchAll = useCallback(async () => {
    const allStockSyms = Object.values(YAHOO_SYMBOLS).flatMap(m => Object.values(m));
    const allIndexSyms = Object.values(INDEX_SYMBOLS).flat();
    const allSyms = [...new Set([...allStockSyms, ...allIndexSyms])];

    try {
      const res = await fetch(`/api/quotes?symbols=${allSyms.join(',')}`);
      if (!res.ok) return;
      const data: QuotesResponse = await res.json();

      const byYahoo: Record<string, QuoteResult> = {};
      for (const q of data.quotes) {
        byYahoo[q.symbol] = q;
      }

      // Map back: our sym → quote
      const stockMap: Record<string, QuoteResult> = {};
      for (const [marketId, mapping] of Object.entries(YAHOO_SYMBOLS)) {
        for (const [ourSym, yahooSym] of Object.entries(mapping)) {
          const q = byYahoo[yahooSym];
          if (q) stockMap[`${marketId}:${ourSym}`] = q;
        }
      }

      const indexMap: Record<string, QuoteResult> = {};
      for (const [marketId, syms] of Object.entries(INDEX_SYMBOLS)) {
        syms.forEach((s, i) => {
          const q = byYahoo[s];
          if (q) indexMap[`${marketId}:${i}`] = q;
        });
      }

      onUpdateRef.current(stockMap, indexMap);
    } catch {
      // silently ignore network failures — we keep showing last known values
    }
  }, []);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(fetchAll, intervalMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchAll, intervalMs]);

  return fetchAll;
}
