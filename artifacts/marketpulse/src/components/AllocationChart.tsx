import { useEffect, useRef, useState } from 'react';
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';
import type { Holding } from '../hooks/usePortfolio';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

interface EnrichedHolding extends Holding {
  currentValue: number | null;
  costBasis: number;
}

interface AllocationChartProps {
  holdings: EnrichedHolding[];
}

const PALETTE = [
  '#3b9eff','#00ff9c','#f5c842','#ff4d4f','#a78bfa','#f97316',
  '#34d399','#fb7185','#60a5fa','#fbbf24','#c084fc','#4ade80',
];

const MARKET_COLORS: Record<string, string> = {
  IN: '#ff9933', US: '#3b9eff', CN: '#ff4d4f', JP: '#ff6b6b',
};

export default function AllocationChart({ holdings }: AllocationChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [view, setView] = useState<'stock' | 'market' | 'sector'>('stock');

  useEffect(() => {
    if (!canvasRef.current || holdings.length === 0) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    let labels: string[];
    let values: number[];
    let colors: string[];

    const total = holdings.reduce((s, h) => s + (h.currentValue ?? h.costBasis), 0);

    if (view === 'stock') {
      const sorted = [...holdings].sort((a, b) => (b.currentValue ?? b.costBasis) - (a.currentValue ?? a.costBasis));
      labels = sorted.map(h => h.sym);
      values = sorted.map(h => h.currentValue ?? h.costBasis);
      colors = sorted.map((_, i) => PALETTE[i % PALETTE.length]);
    } else if (view === 'market') {
      const byMarket: Record<string, number> = {};
      for (const h of holdings) {
        byMarket[h.marketId] = (byMarket[h.marketId] ?? 0) + (h.currentValue ?? h.costBasis);
      }
      const entries = Object.entries(byMarket).sort((a, b) => b[1] - a[1]);
      const MARKET_LABELS: Record<string, string> = { IN: '🇮🇳 India', US: '🇺🇸 USA', CN: '🇨🇳 China', JP: '🇯🇵 Japan' };
      labels = entries.map(([k]) => MARKET_LABELS[k] ?? k);
      values = entries.map(([, v]) => v);
      colors = entries.map(([k]) => MARKET_COLORS[k] ?? '#5a7a94');
    } else {
      // sector
      const bySector: Record<string, number> = {};
      for (const h of holdings) {
        bySector[h.sector] = (bySector[h.sector] ?? 0) + (h.currentValue ?? h.costBasis);
      }
      const entries = Object.entries(bySector).sort((a, b) => b[1] - a[1]);
      labels = entries.map(([k]) => k);
      values = entries.map(([, v]) => v);
      colors = entries.map((_, i) => PALETTE[i % PALETTE.length]);
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.map(c => c + 'cc'),
          borderColor: colors,
          borderWidth: 1,
          hoverBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: {
              color: '#7fb3d3',
              font: { size: 9, family: 'IBM Plex Mono, monospace' },
              padding: 8,
              boxWidth: 10,
              generateLabels: (chart) => {
                const ds = chart.data.datasets[0];
                return (chart.data.labels as string[]).map((label, i) => ({
                  text: `${label} ${((values[i] / total) * 100).toFixed(1)}%`,
                  fillStyle: (ds.backgroundColor as string[])[i],
                  strokeStyle: (ds.borderColor as string[])[i],
                  lineWidth: 1,
                  hidden: false,
                  index: i,
                }));
              },
            },
          },
          tooltip: {
            backgroundColor: '#0b1520',
            borderColor: '#1e2d3d',
            borderWidth: 1,
            titleColor: '#5a7a94',
            bodyColor: '#c8d8e8',
            callbacks: {
              label: (c) => {
                const val = c.raw as number;
                const pct = ((val / total) * 100).toFixed(1);
                return ` ${val >= 1e7 ? (val / 1e7).toFixed(2) + 'Cr' : val >= 1e5 ? (val / 1e5).toFixed(2) + 'L' : val.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${pct}%)`;
              },
            },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [holdings, view, holdings.length]);

  if (holdings.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, fontSize: 10, color: 'var(--muted)' }}>
        Add holdings to see allocation
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', gap: 2, padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
        {(['stock', 'market', 'sector'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            background: view === v ? '#3b9eff20' : 'none',
            border: `1px solid ${view === v ? '#3b9eff' : 'transparent'}`,
            color: view === v ? '#3b9eff' : 'var(--muted)',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, padding: '2px 10px',
            cursor: 'pointer', borderRadius: 2, textTransform: 'capitalize',
          }}>{v}</button>
        ))}
      </div>
      <div style={{ height: 160, padding: '6px 8px' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
