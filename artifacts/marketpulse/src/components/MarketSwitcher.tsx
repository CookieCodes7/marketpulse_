import { MARKET_ORDER, MARKETS } from '../data';

interface MarketSwitcherProps {
  activeMarket: string;
  onChange: (id: string) => void;
}

const MARKET_COLORS: Record<string, string> = {
  IN: '#ff9933',
  US: '#3b9eff',
  CN: '#ff4d4f',
  JP: '#ff6b6b',
};

export default function MarketSwitcher({ activeMarket, onChange }: MarketSwitcherProps) {
  return (
    <div style={{
      background: '#090d11',
      borderBottom: '1px solid #1e2d3d',
      display: 'flex',
      alignItems: 'center',
      height: 44,
      padding: '0 14px',
      gap: 6,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 9, color: '#5a7a94', textTransform: 'uppercase', letterSpacing: 1, marginRight: 8, whiteSpace: 'nowrap' }}>
        Market
      </span>

      <div style={{ display: 'flex', gap: 4, flex: 1 }}>
        {MARKET_ORDER.map(id => {
          const m = MARKETS[id];
          const isActive = activeMarket === id;
          const accentCol = MARKET_COLORS[id];
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              style={{
                background: isActive ? accentCol + '18' : 'var(--bg3)',
                border: `1px solid ${isActive ? accentCol : '#1e2d3d'}`,
                color: isActive ? accentCol : '#5a7a94',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                padding: '0 14px',
                height: 28,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 2,
                transition: 'all .15s',
                fontWeight: isActive ? 600 : 400,
                position: 'relative',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>{m.flag}</span>
              <span>{m.name}</span>
              {isActive && (
                <span style={{ marginLeft: 4, fontSize: 8, color: '#5a7a94' }}>{m.exchange}</span>
              )}
              {id === 'IN' && !isActive && (
                <span style={{
                  position: 'absolute',
                  top: -5,
                  right: -4,
                  background: '#ff9933',
                  color: '#000',
                  fontSize: 7,
                  fontWeight: 700,
                  padding: '1px 4px',
                  borderRadius: 2,
                  letterSpacing: 0.5,
                }}>MAIN</span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 16, marginLeft: 'auto', alignItems: 'center' }}>
        {MARKET_ORDER.map(id => {
          const m = MARKETS[id];
          const idx = m.indices[0];
          const isUp = idx.dir >= 0;
          const accentCol = MARKET_COLORS[id];
          return (
            <div key={id} style={{ textAlign: 'right', opacity: activeMarket === id ? 1 : 0.45, transition: 'opacity .2s' }}>
              <div style={{ fontSize: 8, color: accentCol, textTransform: 'uppercase', letterSpacing: 1 }}>
                {m.flag} {m.benchmarkLabel}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: isUp ? 'var(--bull)' : 'var(--bear)' }}>
                {idx.val} <span style={{ fontSize: 9 }}>{idx.chgP}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
