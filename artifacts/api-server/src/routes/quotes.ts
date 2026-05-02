import { Router } from "express";
import { getYF } from "../lib/yf";

const router = Router();

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
    const yf = await getYF();
    const results = await Promise.allSettled(
      symbols.map((sym) =>
        yf.quote(sym, {}, { validateResult: false }).catch(() => null)
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
