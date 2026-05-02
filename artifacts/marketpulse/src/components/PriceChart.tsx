import { useEffect, useRef, useState, useCallback } from 'react';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, TimeScale } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

type Candle = { date: string; close: number; volume: number };

const PERIODS = [
  { key: '1d',  label: '1D'  },
  { key: '7d',  label: '7D'  },
  { key: '1mo', label: '1M'  },
  { key: '3mo', label: '3M'  },
  { key: '6mo', label: '6M'  },
  { key: '1y',  label: '1Y'  },
  { key: '5y',  label: '5Y'  },
];

interface PriceChartProps {
  yahooSym: string;
  currentPrice: number;
  currency: string;
  accentColor?: string;
  height?: number;
  showPeriodSelector?: boolean;
  defaultPeriod?: string;
  onPeriodChange?: (period: string) => void;
}

export default function PriceChart({
  yahooSym, currentPrice, currency, accentColor = '#3b9eff',
  height = 200, showPeriodSelector = true, defaultPeriod = '1mo',
}: PriceChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [period, setPeriod] = useState(defaultPeriod);
  const [loading, setLoading] = useState(true);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [error, setError] = useState(false);

  const fetchHistory = useCallback(async (p: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/stock/${encodeURIComponent(yahooSym)}/history?period=${p}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setCandles(data.candles ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [yahooSym]);

  useEffect(() => { fetchHistory(period); }, [period, fetchHistory]);

  useEffect(() => {
    if (!canvasRef.current || loading || candles.length === 0) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const closes = candles.map(c => c.close);
    const first = closes[0] ?? currentPrice;
    const last = closes[closes.length - 1] ?? currentPrice;
    const isUp = last >= first;
    const col = isUp ? '#00ff9c' : '#ff4d4f';

    const labels = candles.map(c => {
      const d = new Date(c.date);
      if (period === '1d') return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      if (period === '7d') return d.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit' });
      if (period === '5y') return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const pctChange = first ? ((last - first) / first * 100).toFixed(2) : '0.00';

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: closes,
          borderColor: col,
          borderWidth: 1.5,
          pointRadius: 0,
          fill: true,
          backgroundColor: col + '1a',
          tension: 0.2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0b1520',
            borderColor: col,
            borderWidth: 1,
            titleColor: '#5a7a94',
            bodyColor: '#c8d8e8',
            callbacks: {
              label: (c) => ` ${currency}${(c.raw as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              title: (items) => items[0]?.label ?? '',
            },
          },
          // @ts-ignore - custom plugin for pct change label
          pctLabel: {
            afterDraw(chart: Chart) {
              const ctx = chart.ctx;
              ctx.save();
              ctx.font = '10px IBM Plex Mono, monospace';
              ctx.fillStyle = col;
              ctx.textAlign = 'right';
              ctx.fillText(`${isUp ? '+' : ''}${pctChange}%  period chg`, chart.width - 8, 14);
              ctx.restore();
            }
          }
        },
        scales: {
          x: {
            display: true,
            grid: { color: '#0f1922' },
            ticks: {
              color: '#3a5a74', font: { size: 8, family: 'IBM Plex Mono' },
              maxTicksLimit: 8, maxRotation: 0,
            },
          },
          y: {
            display: true,
            position: 'right',
            grid: { color: '#1a2533' },
            ticks: {
              color: '#5a7a94', font: { size: 9, family: 'IBM Plex Mono' },
              callback: (v) => currency + Number(v).toLocaleString('en-US'),
            },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [candles, loading, period, currentPrice, currency]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {showPeriodSelector && (
        <div style={{ display: 'flex', gap: 2, padding: '6px 8px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                background: period === p.key ? accentColor + '20' : 'none',
                border: `1px solid ${period === p.key ? accentColor : 'transparent'}`,
                color: period === p.key ? accentColor : 'var(--muted)',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                padding: '2px 10px',
                cursor: 'pointer',
                borderRadius: 2,
                fontWeight: period === p.key ? 600 : 400,
                transition: 'all .1s',
              }}
            >{p.label}</button>
          ))}
        </div>
      )}
      <div style={{ height, position: 'relative', background: 'var(--bg)' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}>
            Loading chart data...
          </div>
        )}
        {error && !loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bear)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}>
            Chart data unavailable
          </div>
        )}
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: loading ? 'none' : 'block' }} />
      </div>
    </div>
  );
}
