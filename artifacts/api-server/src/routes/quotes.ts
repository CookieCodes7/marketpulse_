import { Router } from "express";

const router = Router();

// yahoo-finance2 v3: default export is a class, must be instantiated
// Using dynamic import to avoid esbuild ESM/CJS resolution issues
let yf: { quote: (sym: string, opts: object, extra: object) => Promise<unknown> } | null = null;
async function getYF() {
  if (yf) return yf;
  const mod = await import("yahoo-finance2");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const YF = (mod.default ?? mod) as any;
  yf = typeof YF === "function" ? new YF() : YF;
  return yf!;
}

router.get("/quotes", async (req, res) => {
  const raw = req.query.symbols as string;
  if (!raw) {
    res.status(400).json({ error: "symbols query param required" });
    return;
  }

  const symbols = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (symbols.length === 0 || symbols.length > 60) {
    res.status(400).json({ error: "symbols must be 1-60 comma-separated tickers" });
    return;
  }

  try {
    const client = await getYF();
    const results = await Promise.allSettled(
      symbols.map((sym) =>
        client.quote(sym, {}, { validateResult: false }).catch(() => null)
      )
    );

    const quotes = results.map((r, i) => {
      const sym = symbols[i];
      if (r.status === "rejected" || !r.value) {
        return { symbol: sym, error: true };
      }
      const q = r.value as Record<string, unknown>;
      return {
        symbol: sym,
        price: (q.regularMarketPrice as number) ?? null,
        previousClose: (q.regularMarketPreviousClose as number) ?? null,
        change: (q.regularMarketChange as number) ?? null,
        changePercent: (q.regularMarketChangePercent as number) ?? null,
        currency: (q.currency as string) ?? null,
        shortName: ((q.shortName ?? q.longName) as string) ?? sym,
        marketState: (q.marketState as string) ?? null,
        volume: (q.regularMarketVolume as number) ?? null,
        trailingPE: (q.trailingPE as number) ?? null,
      };
    });

    res.json({ quotes, fetchedAt: new Date().toISOString() });
  } catch (err) {
    req.log.error({ err }, "quotes fetch failed");
    res.status(502).json({ error: "upstream fetch failed" });
  }
});

export default router;
