import { useState, useRef, useEffect } from 'react';
import { searchStocks, StockEntry } from '../data/stockUniverse';

interface StockSearchProps {
  marketId: string;
  onSelect: (entry: StockEntry) => void;
  placeholder?: string;
}

const SECTOR_COLORS: Record<string, string> = {
  'IT': '#3b9eff', 'Technology': '#3b9eff', 'Semiconductors': '#a78bfa',
  'Banking': '#f59e0b', 'Finance': '#f59e0b', 'Fintech': '#f59e0b',
  'Pharma': '#34d399', 'Healthcare': '#34d399', 'Biotech': '#34d399',
  'Energy': '#f97316', 'Auto': '#60a5fa', 'Electric Vehicles': '#4ade80',
  'FMCG': '#fb7185', 'Consumer': '#fb7185', 'Retail': '#fb7185',
  'E-Commerce': '#c084fc', 'Gaming': '#f472b6',
};

function getSectorColor(sector: string) {
  for (const [key, color] of Object.entries(SECTOR_COLORS)) {
    if (sector.includes(key)) return color;
  }
  return '#5a7a94';
}

export default function StockSearch({ marketId, onSelect, placeholder }: StockSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockEntry[]>([]);
  const [focused, setFocused] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length > 0) {
      setResults(searchStocks(marketId, query, 12));
      setHighlighted(0);
    } else {
      setResults([]);
    }
  }, [query, marketId]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && results[highlighted]) {
      pick(results[highlighted]);
    } else if (e.key === 'Escape') {
      setFocused(false);
      setQuery('');
    }
  };

  const pick = (entry: StockEntry) => {
    onSelect(entry);
    setQuery('');
    setResults([]);
    setFocused(false);
    inputRef.current?.blur();
  };

  const showDropdown = focused && results.length > 0;

  return (
    <div className="stock-search-wrap" style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 340 }}>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--muted)', fontSize: 11, pointerEvents: 'none',
        }}>⌕</span>
        <input
          ref={inputRef}
          className="mp-search"
          style={{ width: '100%', paddingLeft: 24, paddingRight: query ? 24 : 10 }}
          type="text"
          placeholder={placeholder ?? 'Search ticker or company...'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKey}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
            style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
              fontSize: 12, padding: 0, lineHeight: 1,
            }}
          >✕</button>
        )}
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#111820',
            border: '1px solid var(--border)',
            borderTop: '1px solid var(--bull)',
            zIndex: 9999,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: '4px 10px', fontSize: 8, color: 'var(--muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {results.length} result{results.length !== 1 ? 's' : ''} · click to add to watchlist
          </div>
          {results.map((r, i) => {
            const scolor = getSectorColor(r.sector);
            return (
              <div
                key={r.yahoo}
                onMouseEnter={() => setHighlighted(i)}
                onMouseDown={e => { e.preventDefault(); pick(r); }}
                style={{
                  padding: '7px 10px',
                  background: i === highlighted ? '#1c2530' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: '1px solid #0f1922',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 11, color: '#7fb3d3', minWidth: 80, flexShrink: 0 }}>
                  {r.sym}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name}
                </span>
                <span style={{
                  fontSize: 8, padding: '1px 5px', borderRadius: 2, whiteSpace: 'nowrap', flexShrink: 0,
                  background: scolor + '18', color: scolor, border: `1px solid ${scolor}44`,
                }}>
                  {r.sector}
                </span>
                <span style={{ fontSize: 9, color: 'var(--bull)', flexShrink: 0 }}>＋</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
