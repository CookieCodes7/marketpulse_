import { useState, useEffect, useCallback } from 'react';

export interface Holding {
  id: string;
  sym: string;       // display symbol, e.g. RELIANCE
  yahoo: string;     // yahoo finance ticker, e.g. RELIANCE.NS
  name: string;
  marketId: string;  // IN | US | CN | JP
  currency: string;  // ₹ | $ | ¥
  sector: string;
  shares: number;
  avgCost: number;   // buy price per share
  addedAt: string;
}

export interface LiveQuote {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  error?: boolean;
}

const STORAGE_KEY = 'marketpulse_portfolio_v1';

function loadHoldings(): Holding[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHoldings(h: Holding[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(h)); } catch { /* ignore */ }
}

export function usePortfolio() {
  const [holdings, setHoldings] = useState<Holding[]>(loadHoldings);
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const [quoteStatus, setQuoteStatus] = useState<'idle' | 'loading' | 'live' | 'error'>('idle');

  // Persist to localStorage whenever holdings change
  useEffect(() => { saveHoldings(holdings); }, [holdings]);

  const addHolding = useCallback((h: Omit<Holding, 'id' | 'addedAt'>) => {
    setHoldings(prev => {
      // If same yahoo ticker exists, update shares/avgCost (weighted average)
      const existing = prev.find(x => x.yahoo === h.yahoo);
      if (existing) {
        return prev.map(x => x.yahoo !== h.yahoo ? x : {
          ...x,
          shares: x.shares + h.shares,
          avgCost: (x.shares * x.avgCost + h.shares * h.avgCost) / (x.shares + h.shares),
        });
      }
      return [...prev, { ...h, id: crypto.randomUUID(), addedAt: new Date().toISOString() }];
    });
  }, []);

  const removeHolding = useCallback((id: string) => {
    setHoldings(prev => prev.filter(h => h.id !== id));
  }, []);

  const updateShares = useCallback((id: string, shares: number) => {
    setHoldings(prev => prev.map(h => h.id !== id ? h : { ...h, shares }));
  }, []);

  const updateAvgCost = useCallback((id: string, avgCost: number) => {
    setHoldings(prev => prev.map(h => h.id !== id ? h : { ...h, avgCost }));
  }, []);

  // Fetch live quotes for all holdings
  const fetchQuotes = useCallback(async () => {
    if (holdings.length === 0) { setQuoteStatus('idle'); return; }
    setQuoteStatus('loading');
    const symbols = holdings.map(h => h.yahoo);
    // Batch into groups of 40
    const batches: string[][] = [];
    for (let i = 0; i < symbols.length; i += 40) batches.push(symbols.slice(i, i + 40));
    try {
      const results: Record<string, LiveQuote> = {};
      await Promise.all(batches.map(async batch => {
        const res = await fetch(`/api/quotes?symbols=${batch.join(',')}`);
        const data = await res.json();
        for (const q of data.quotes ?? []) {
          results[q.symbol] = {
            price: q.price, change: q.change, changePercent: q.changePercent,
            volume: q.volume, error: q.error,
          };
        }
      }));
      setQuotes(results);
      setQuoteStatus('live');
    } catch {
      setQuoteStatus('error');
    }
  }, [holdings]);

  // Auto-refresh every 45s
  useEffect(() => {
    fetchQuotes();
    const id = setInterval(fetchQuotes, 45000);
    return () => clearInterval(id);
  }, [fetchQuotes]);

  // Computed metrics per holding
  const enriched = holdings.map(h => {
    const q = quotes[h.yahoo];
    const currentPrice = q?.price ?? null;
    const currentValue = currentPrice != null ? h.shares * currentPrice : null;
    const costBasis = h.shares * h.avgCost;
    const pnl = currentValue != null ? currentValue - costBasis : null;
    const pnlPct = pnl != null ? (pnl / costBasis) * 100 : null;
    const dayPnl = q?.change != null ? h.shares * q.change : null;
    return { ...h, currentPrice, currentValue, costBasis, pnl, pnlPct, dayPnl, changePercent: q?.changePercent ?? null };
  });

  const totalValue = enriched.reduce((s, h) => s + (h.currentValue ?? h.costBasis), 0);
  const totalCost = enriched.reduce((s, h) => s + h.costBasis, 0);
  const totalPnl = enriched.reduce((s, h) => s + (h.pnl ?? 0), 0);
  const totalDayPnl = enriched.reduce((s, h) => s + (h.dayPnl ?? 0), 0);
  const totalReturn = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return {
    holdings, enriched, quotes, quoteStatus, fetchQuotes,
    addHolding, removeHolding, updateShares, updateAvgCost,
    summary: { totalValue, totalCost, totalPnl, totalDayPnl, totalReturn },
  };
}
