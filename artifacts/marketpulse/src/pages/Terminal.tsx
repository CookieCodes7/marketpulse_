import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'wouter';
import SparkChart from '../components/SparkChart';
import WorldMap from '../components/WorldMap';
import Clock from '../components/Clock';
import MarketSwitcher from '../components/MarketSwitcher';
import { MARKETS, COUNTRY_DATA, Stock } from '../data';
import { useRealTimeQuotes, QuoteResult } from '../hooks/useRealTimeQuotes';

function getSignalColor(sig: string) {
  return sig === 'BULL' ? 'var(--bull)' : sig === 'BEAR' ? 'var(--bear)' : 'var(--neut)';
}
function getSignalLabel(sig: string) {
  return sig === 'BULL' ? '▲ BULLISH' : sig === 'BEAR' ? '▼ BEARISH' : '● NEUTRAL';
}
function getSentClass(sent: string) {
  return sent === 'BULL' ? 'tag-bull' : sent === 'BEAR' ? 'tag-bear' : 'tag-neut';
}
function getSentColor(sent: string) {
  return sent === 'BULL' ? 'var(--bull)' : sent === 'BEAR' ? 'var(--bear)' : 'var(--neut)';
}

const MARKET_ACCENT: Record<string, string> = {
  IN: '#ff9933',
  US: '#3b9eff',
  CN: '#ff4d4f',
  JP: '#ff6b6b',
};

function fmtVol(v: number | null): string {
  if (!v) return '—';
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return String(v);
}

function fmtIdx(v: number | null): string {
  if (v === null) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Terminal() {
  const [activeMarket, setActiveMarket] = useState('IN');
  const [stocksByMarket, setStocksByMarket] = useState<Record<string, Stock[]>>(() =>
    Object.fromEntries(Object.entries(MARKETS).map(([id, m]) => [id, m.stocks.map(s => ({ ...s }))]))
  );
  const [activeIdxByMarket, setActiveIdxByMarket] = useState<Record<string, number>>({ IN: 0, US: 0, CN: 0, JP: 0 });
  const [liveQuotes, setLiveQuotes] = useState<Record<string, QuoteResult>>({});
  const [liveIndices, setLiveIndices] = useState<Record<string, QuoteResult>>({});
  const [quoteStatus, setQuoteStatus] = useState<'loading' | 'live' | 'error'>('loading');
  const [selectedCountry, setSelectedCountry] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const market = MARKETS[activeMarket];
  const stocks = stocksByMarket[activeMarket];
  const activeIdx = activeIdxByMarket[activeMarket];
  const activeStock = stocks[activeIdx];
  const accentCol = MARKET_ACCENT[activeMarket];

  // Real-time quote update handler
  const handleQuoteUpdate = useCallback(
    (stockMap: Record<string, QuoteResult>, indexMap: Record<string, QuoteResult>) => {
      setLiveQuotes(stockMap);
      setLiveIndices(indexMap);
      setQuoteStatus('live');

      // Merge real prices into stock state
      setStocksByMarket(prev => {
        const next: Record<string, Stock[]> = {};
        for (const [mId, mStocks] of Object.entries(prev)) {
          next[mId] = mStocks.map(s => {
            const q = stockMap[`${mId}:${s.sym}`];
            if (!q || q.error || q.price === null) return s;
            return {
              ...s,
              price: q.price,
              chg: q.change ?? s.chg,
              chgP: q.changePercent ?? s.chgP,
              vol: fmtVol(q.volume),
              pe: q.trailingPE ? q.trailingPE.toFixed(1) : s.pe,
            };
          });
        }
        return next;
      });
    },
    []
  );

  const refetch = useRealTimeQuotes(handleQuoteUpdate, 45000);

  // Handle fetch errors after 10s of no data
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    errorTimerRef.current = setTimeout(() => {
      setQuoteStatus(s => s === 'loading' ? 'error' : s);
    }, 12000);
    return () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current); };
  }, []);

  const handleMarketChange = (id: string) => {
    setActiveMarket(id);
    setSelectedCountry(null);
  };

  const addTicker = () => {
    const sym = prompt('Enter ticker symbol:');
    if (!sym) return;
    const newStock: Stock = {
      sym: sym.toUpperCase(), name: 'Custom',
      price: +(100 + Math.random() * 4000).toFixed(2),
      chg: +(Math.random() * 10 - 5).toFixed(2),
      chgP: +(Math.random() * 5 - 2.5).toFixed(2),
      sig: ['BULL', 'BEAR', 'NEUT'][Math.floor(Math.random() * 3)],
      conf: 40 + Math.floor(Math.random() * 50),
      target: 100 + Math.floor(Math.random() * 4000),
      days: 5, vol: '5.2M', pe: '22.1',
    };
    setStocksByMarket(prev => ({ ...prev, [activeMarket]: [...prev[activeMarket], newStock] }));
  };

  const handleCountryClick = useCallback((id: number) => {
    setSelectedCountry(id);
  }, []);

  const country = selectedCountry ? COUNTRY_DATA[selectedCountry] : null;
  const countryCol = country ? getSignalColor(country.sig) : 'var(--bull)';
  const upside = ((activeStock.target - activeStock.price) / activeStock.price * 100).toFixed(1);
  const col = getSignalColor(activeStock.sig);

  // Build live index rows for active market
  const liveIdxRows = market.indices.map((idx, i) => {
    const q = liveIndices[`${activeMarket}:${i}`];
    if (!q || q.price === null) return idx;
    const dir = (q.change ?? 0) >= 0 ? 1 : -1;
    const chgSign = dir >= 0 ? '+' : '';
    return {
      ...idx,
      val: fmtIdx(q.price),
      chg: `${chgSign}${(q.change ?? 0).toFixed(2)}`,
      chgP: `${chgSign}${(q.changePercent ?? 0).toFixed(2)}%`,
      dir,
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Ticker Bar */}
      <div id="ticker-bar">
        <div id="ticker-track">
          {[...stocks, ...stocks].map((s, i) => (
            <span key={i} className="tick-item">
              <span className="tick-sym">{s.sym.split('.')[0]}</span>
              <span className="tick-price">{s.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={s.chg >= 0 ? 'tick-chg-up' : 'tick-chg-dn'}>
                {s.chg >= 0 ? '+' : ''}{Math.abs(s.chgP).toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Market Switcher */}
      <MarketSwitcher activeMarket={activeMarket} onChange={handleMarketChange} liveIndices={liveIndices} />

      {/* Header */}
      <div className="mp-header">
        <Link href="/" className="mp-logo" style={{ color: accentCol }}>
          MARKET<span style={{ color: '#3b9eff' }}>PULSE</span>
        </Link>
        <div style={{
          fontSize: 9,
          color: accentCol,
          background: accentCol + '18',
          border: `1px solid ${accentCol}44`,
          padding: '2px 8px',
          letterSpacing: 1,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          {market.flag} {market.name} · {market.exchange}
        </div>
        <input className="mp-search" type="text" placeholder={`Search ${market.name} ticker...`} />
        <div className="hdr-stat">
          <span className="lbl">{market.benchmarkLabel}</span>
          <span className="val" style={{ color: accentCol }}>
            {liveIdxRows[0]?.val || market.benchmarkVal}
          </span>
        </div>
        <div className="hdr-stat">
          <span className="lbl">{market.vixLabel}</span>
          <span className="val" style={{ color: 'var(--neut)' }}>{market.vixVal}</span>
        </div>
        <div className="hdr-stat">
          <span className="lbl">Data</span>
          <span className="val">
            {quoteStatus === 'loading' && <span style={{ color: 'var(--neut)' }}>◌ LOADING</span>}
            {quoteStatus === 'live' && (
              <span style={{ color: 'var(--bull)' }}>
                <span className="session-dot" style={{ background: 'var(--bull)' }} />LIVE
              </span>
            )}
            {quoteStatus === 'error' && (
              <span
                style={{ color: 'var(--bear)', cursor: 'pointer' }}
                title="Click to retry"
                onClick={() => { setQuoteStatus('loading'); refetch(); }}
              >⚠ RETRY</span>
            )}
          </span>
        </div>
        <Clock />
      </div>

      {/* Main */}
      <div className="mp-main">
        {/* LEFT: Watchlist */}
        <div className="mp-left">
          <div className="panel-hdr">
            {market.flag} Watchlist
            <button onClick={addTicker}>+ ADD</button>
          </div>
          {stocks.map((s, i) => {
            const q = liveQuotes[`${activeMarket}:${s.sym}`];
            const price = q?.price ?? s.price;
            const chgP = q?.changePercent ?? s.chgP;
            const chg = q?.change ?? s.chg;
            return (
              <div
                key={s.sym}
                className={`watch-item${i === activeIdx ? ' active' : ''}`}
                style={i === activeIdx ? { borderLeftColor: accentCol } : undefined}
                onClick={() => setActiveIdxByMarket(prev => ({ ...prev, [activeMarket]: i }))}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="w-sym" style={{ color: i === activeIdx ? accentCol : '#7fb3d3' }}>
                    {s.sym.split('.')[0]}
                  </span>
                  <span className={chg >= 0 ? 'bull' : 'bear'} style={{ fontSize: 12, fontWeight: 500 }}>
                    {market.currency}{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span className="w-name">{s.name.substring(0, 14)}</span>
                  <span className={chg >= 0 ? 'bull' : 'bear'} style={{ fontSize: 10 }}>
                    {chg >= 0 ? '+' : ''}{chgP.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CENTER */}
        <div className="mp-center">
          {/* Indices */}
          <div className="indices-row">
            {liveIdxRows.map(idx => (
              <div key={idx.name} className="idx-card" style={{ borderTop: `2px solid ${idx.dir >= 0 ? 'var(--bull)' : 'var(--bear)'}` }}>
                <div className="idx-name">{idx.name}</div>
                <div className={`idx-val ${idx.dir >= 0 ? 'bull' : 'bear'}`}>{idx.val}</div>
                <div className={`idx-chg ${idx.dir >= 0 ? 'bull' : 'bear'}`}>{idx.chg} ({idx.chgP})</div>
              </div>
            ))}
          </div>

          {/* Stock Detail */}
          <div className="stock-detail-row">
            <div className="stock-info" style={{ borderLeft: `2px solid ${accentCol}` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span className="stock-sym" style={{ color: accentCol }}>{activeStock.sym.split('.')[0]}</span>
                <span className="stock-name">{activeStock.name}</span>
                <span style={{ fontSize: 8, color: '#5a7a94', background: accentCol + '18', padding: '1px 6px', border: `1px solid ${accentCol}33` }}>
                  {market.exchange}
                </span>
                {quoteStatus === 'live' && (
                  <span style={{ fontSize: 8, color: 'var(--bull)', background: '#00ff9c11', padding: '1px 6px', border: '1px solid #00ff9c33' }}>
                    ● LIVE DATA
                  </span>
                )}
              </div>
              <div className={`stock-price ${activeStock.chg >= 0 ? 'bull' : 'bear'}`}>
                {market.currency}{activeStock.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="stock-meta">
                <span>CHG: <b className={activeStock.chg >= 0 ? 'bull' : 'bear'}>{activeStock.chg >= 0 ? '+' : ''}{activeStock.chg.toFixed(2)} ({activeStock.chg >= 0 ? '+' : ''}{activeStock.chgP.toFixed(2)}%)</b></span>
                <span>VOL: {activeStock.vol}</span>
                <span>P/E: {activeStock.pe}</span>
              </div>
            </div>
          </div>

          {/* Spark Chart */}
          <SparkChart stock={activeStock} />

          {/* AI Panel */}
          <div className="ai-panel-row">
            <div className="signal-card">
              <div className="signal-label">AI Signal</div>
              <div className="signal-val" style={{ color: col }}>{getSignalLabel(activeStock.sig)}</div>
              <div className="conf-bar-wrap">
                <div className="conf-bar" style={{ width: `${activeStock.conf}%`, background: col }} />
              </div>
              <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>Confidence: {activeStock.conf}%</div>
            </div>
            <div className="signal-card">
              <div className="signal-label">Target Price</div>
              <div className="signal-val" style={{ color: col }}>
                {market.currency}{activeStock.target.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>
                {Number(upside) > 0 ? '+' : ''}{upside}% · {activeStock.days}-day horizon
              </div>
            </div>
          </div>

          <div className="ai-explain">
            <strong>AI Reasoning Engine — {activeStock.sym.split('.')[0]} · {market.flag} {market.name}</strong>
            {market.aiExplains[activeStock.sym] || 'Analyzing sentiment signals across news and social media...'}
          </div>

          {/* Map Section (mini) */}
          <div className="map-section">
            <div className="map-hdr">
              <span>Global Market Impact Map</span>
              {(['all', 'high', 'tech', 'energy', '24h', '7d'] as const).map(f => (
                <button
                  key={f}
                  className={`filter-btn${activeFilter === f ? ' active' : ''}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f === 'all' ? 'All' : f === 'high' ? 'High Signal' : f === 'tech' ? 'Tech' : f === 'energy' ? 'Energy' : f}
                </button>
              ))}
              <Link href="/map" className="map-link-btn">⊞ Full Screen</Link>
            </div>
            <WorldMap height={220} onCountryClick={handleCountryClick} />
          </div>

          {/* Country Panel (mini) */}
          {country && (
            <div className="country-panel visible" style={{ margin: '0 8px 8px' }}>
              <div className="cp-header">
                <span className="cp-name" style={{ color: countryCol }}>{country.name}</span>
                <button className="cp-close" onClick={() => setSelectedCountry(null)}>✕</button>
              </div>
              <div className="cp-grid">
                <div className="cp-metric"><div className="lbl">Sentiment Score</div><div className="val" style={{ color: countryCol }}>{country.score.toFixed(2)}</div></div>
                <div className="cp-metric"><div className="lbl">Signal</div><div className="val" style={{ color: countryCol }}>{country.sig}</div></div>
                <div className="cp-metric"><div className="lbl">Top Sector</div><div className="val">{country.sector}</div></div>
                <div className="cp-metric"><div className="lbl">Trend</div><div className="val" style={{ color: countryCol }}>{country.trend}</div></div>
              </div>
              <div className="cp-headlines">
                <b style={{ color: '#5a7a94', fontSize: 9 }}>KEY HEADLINES</b><br />
                {country.headlines.map((h, i) => <span key={i}>· {h}<br /></span>)}
              </div>
              <div className="cp-ai">
                <span style={{ color: '#5a7a94', fontSize: 9 }}>AI SUMMARY</span><br />
                {country.ai}
              </div>
            </div>
          )}

          {/* Correlation */}
          <div style={{ padding: 8, flexShrink: 0 }}>
            <div className="panel-hdr" style={{ marginBottom: 4 }}>News → Stock Correlation · {market.flag} {market.name}</div>
            {market.corr.map(c => {
              const abs = Math.abs(c.score);
              const ccol = c.dir >= 0 ? 'var(--bull)' : 'var(--bear)';
              return (
                <div key={c.sym} className="corr-item">
                  <span className="corr-sym">{c.sym.split('.')[0]}</span>
                  <div className="corr-bar-wrap">
                    <div className="corr-bar" style={{ width: `${(abs * 100).toFixed(0)}%`, background: ccol }} />
                  </div>
                  <span className="corr-val" style={{ color: ccol }}>{c.score > 0 ? '+' : ''}{c.score.toFixed(2)}</span>
                  <span className="corr-mentions">{(c.mentions / 1000).toFixed(1)}K ments</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: News */}
        <div className="mp-right">
          <div className="panel-hdr">{market.flag} {market.name} News Feed</div>
          {market.news.map((n, i) => (
            <div key={i} className="news-item">
              <div className="news-src"><span>{n.src}</span><span>{n.time}</span></div>
              <div className="news-title">{n.title}</div>
              <div className="news-tags">
                <span className="tag tag-ticker">{n.ticker.split('.')[0]}</span>
                <span className={`tag ${getSentClass(n.sent)}`}>{n.sent}</span>
                <span style={{ fontSize: 8, color: 'var(--muted)', marginLeft: 'auto' }}>Impact: {(n.impact * 10).toFixed(1)}</span>
              </div>
              <div className="impact-bar" style={{ width: `${(n.impact * 100).toFixed(0)}%`, background: getSentColor(n.sent) }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
