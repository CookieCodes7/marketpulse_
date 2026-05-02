import { Router } from "express";
import OpenAI from "openai";
import { getYF } from "../lib/yf";

const router = Router();

interface HoldingInput {
  sym: string;
  yahoo: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number | null;
  currentValue: number | null;
  costBasis: number;
  pnl: number | null;
  pnlPct: number | null;
  changePercent: number | null;
  dayPnl: number | null;
  sector: string;
  marketId: string;
  currency: string;
}

interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalReturn: number;
  totalDayPnl: number;
}

router.post("/portfolio/analysis", async (req, res) => {
  const { holdings, summary }: { holdings: HoldingInput[]; summary: PortfolioSummary } = req.body;

  if (!holdings || holdings.length === 0) {
    res.status(400).json({ error: "No holdings provided" });
    return;
  }

  try {
    const yf = await getYF();

    // Fetch news for top 5 holdings by value
    const top5 = [...holdings]
      .sort((a, b) => (b.currentValue ?? b.costBasis) - (a.currentValue ?? a.costBasis))
      .slice(0, 5);

    type NewsItem = { title?: string; publisher?: string };
    const newsMap: Record<string, string[]> = {};
    await Promise.allSettled(
      top5.map(async h => {
        try {
          const r = await yf.search(h.yahoo, { newsCount: 5, enableFuzzyQuery: false } as object) as Record<string, unknown>;
          const items = (r.news ?? []) as NewsItem[];
          newsMap[h.sym] = items.slice(0, 4).map(n => `"${n.title ?? ""}" — ${n.publisher ?? ""}`);
        } catch { /* ignore */ }
      })
    );

    // Build portfolio context
    const totalValue = summary.totalValue || 1;
    const holdingsContext = holdings.map((h, i) => {
      const alloc = ((h.currentValue ?? h.costBasis) / totalValue * 100).toFixed(1);
      const pnlStr = h.pnlPct != null ? `${h.pnlPct >= 0 ? "+" : ""}${h.pnlPct.toFixed(2)}%` : "N/A";
      const dayStr = h.changePercent != null ? `${h.changePercent >= 0 ? "+" : ""}${h.changePercent.toFixed(2)}%` : "N/A";
      const news = newsMap[h.sym] ? `\n     Recent news: ${newsMap[h.sym].slice(0, 2).join("; ")}` : "";
      return `${i + 1}. ${h.sym} — ${h.name} [${h.marketId} | ${h.sector}]
     Shares: ${h.shares} | Avg Cost: ${h.currency}${h.avgCost.toFixed(2)} | Price: ${h.currentPrice != null ? h.currency + h.currentPrice.toFixed(2) : "N/A"}
     P&L: ${pnlStr} | Today: ${dayStr} | Allocation: ${alloc}%${news}`;
    }).join("\n\n");

    // Sector breakdown
    const sectorMap: Record<string, number> = {};
    for (const h of holdings) {
      const v = h.currentValue ?? h.costBasis;
      sectorMap[h.sector] = (sectorMap[h.sector] ?? 0) + v;
    }
    const sectorBreakdown = Object.entries(sectorMap)
      .sort((a, b) => b[1] - a[1])
      .map(([s, v]) => `${s}: ${(v / totalValue * 100).toFixed(1)}%`)
      .join(", ");

    const marketMap: Record<string, number> = {};
    for (const h of holdings) {
      const v = h.currentValue ?? h.costBasis;
      marketMap[h.marketId] = (marketMap[h.marketId] ?? 0) + v;
    }
    const marketBreakdown = Object.entries(marketMap)
      .sort((a, b) => b[1] - a[1])
      .map(([m, v]) => `${m}: ${(v / totalValue * 100).toFixed(1)}%`)
      .join(", ");

    const prompt = `You are a senior portfolio manager at a top asset management firm. Analyze this portfolio and return a detailed JSON report.

PORTFOLIO OVERVIEW:
- Total Value: ${summary.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
- Total Invested: ${summary.totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
- Total P&L: ${summary.totalPnl >= 0 ? "+" : ""}${summary.totalPnl.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${summary.totalReturn >= 0 ? "+" : ""}${summary.totalReturn.toFixed(2)}%)
- Today's P&L: ${summary.totalDayPnl >= 0 ? "+" : ""}${summary.totalDayPnl.toLocaleString("en-US", { minimumFractionDigits: 2 })}
- Positions: ${holdings.length}
- Sector Exposure: ${sectorBreakdown}
- Market Exposure: ${marketBreakdown}

HOLDINGS (with recent news where available):
${holdingsContext}

Respond ONLY with a valid JSON object (no markdown, no code fences). Use exactly this structure:
{
  "healthScore": 72,
  "verdict": "Moderately Diversified",
  "riskLevel": "MEDIUM",
  "summary": "2-3 sentence overall assessment of portfolio strength, diversification, and current performance.",
  "holdings": [
    {
      "sym": "AAPL",
      "action": "HOLD",
      "confidence": 75,
      "reasoning": "One concise sentence with specific insight based on P&L, news, and market position.",
      "risk": "MEDIUM"
    }
  ],
  "suggestions": [
    {
      "priority": "HIGH",
      "title": "Short actionable title",
      "detail": "One sentence explaining what to do and why, citing specific data."
    }
  ],
  "riskAlerts": [
    {
      "severity": "HIGH",
      "message": "Specific risk message with data (e.g. percentages, stock names)."
    }
  ],
  "diversificationScore": 58,
  "sectorExposure": { "Technology": 55, "Finance": 25 },
  "marketExposure": { "US": 60, "IN": 30 },
  "topOpportunity": "AAPL",
  "topRisk": "NVDA",
  "generatedAt": "${new Date().toISOString()}"
}

Rules:
- healthScore: 0-100 (based on diversification, P&L, concentration, market mix)
- verdict: one of "Well Diversified" | "Moderately Diversified" | "Concentrated Risk" | "High Growth" | "Defensive" | "Speculative"
- riskLevel: "LOW" | "MEDIUM" | "HIGH" | "VERY HIGH"
- action per holding: "BUY_MORE" | "HOLD" | "REDUCE" | "SELL" | "WATCH"
- Give 3-5 suggestions, 0-3 riskAlerts (only real concerns)
- diversificationScore: 0-100 (100 = perfectly diversified)
- topOpportunity/topRisk: symbol strings (must be from the holdings list)`;

    const openai = new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    });

    let analysis: Record<string, unknown> | null = null;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: "You are a senior portfolio manager. Always respond with a single valid JSON object only. No markdown, no code blocks, no prose outside JSON.",
          },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 2000,
      });

      const rawText = (completion.choices[0]?.message?.content ?? "").trim();
      const jsonText = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      if (jsonText.startsWith("{")) {
        analysis = JSON.parse(jsonText) as Record<string, unknown>;
      }
    } catch (aiErr) {
      req.log.warn({ aiErr }, "OpenAI portfolio analysis failed, using fallback");
    }

    // Fallback: compute basic metrics from raw data
    if (!analysis) {
      const sectorCount = Object.keys(sectorMap).length;
      const marketCount = Object.keys(marketMap).length;
      const topHoldingAlloc = Math.max(...holdings.map(h => (h.currentValue ?? h.costBasis) / totalValue * 100));
      const diversificationScore = Math.min(100, Math.round((sectorCount * 15 + marketCount * 10 + (100 - topHoldingAlloc))));
      const healthScore = Math.min(100, Math.round(
        (diversificationScore * 0.4) +
        (summary.totalReturn > 0 ? Math.min(40, summary.totalReturn) : Math.max(-20, summary.totalReturn)) +
        (marketCount > 1 ? 20 : 0) + 20
      ));

      const holdingResults = holdings.map(h => ({
        sym: h.sym,
        action: h.pnlPct != null && h.pnlPct > 30 ? "REDUCE" : h.pnlPct != null && h.pnlPct < -20 ? "WATCH" : "HOLD",
        confidence: 60,
        reasoning: h.pnlPct != null
          ? `Currently ${h.pnlPct >= 0 ? "up" : "down"} ${Math.abs(h.pnlPct).toFixed(1)}% from cost basis of ${h.currency}${h.avgCost.toFixed(2)}.`
          : "No live price data available for detailed assessment.",
        risk: topHoldingAlloc > 30 ? "HIGH" : "MEDIUM",
      }));

      analysis = {
        healthScore,
        verdict: sectorCount >= 4 ? "Moderately Diversified" : "Concentrated Risk",
        riskLevel: topHoldingAlloc > 50 ? "HIGH" : topHoldingAlloc > 30 ? "MEDIUM" : "LOW",
        summary: `Portfolio of ${holdings.length} positions spanning ${sectorCount} sector${sectorCount > 1 ? "s" : ""} across ${marketCount} market${marketCount > 1 ? "s" : ""}. Total return of ${summary.totalReturn >= 0 ? "+" : ""}${summary.totalReturn.toFixed(2)}% from invested capital.`,
        holdings: holdingResults,
        suggestions: [
          {
            priority: sectorCount < 3 ? "HIGH" : "MEDIUM",
            title: "Improve sector diversification",
            detail: `Currently holding ${sectorCount} sector${sectorCount > 1 ? "s" : ""}. Consider spreading across 5+ sectors to reduce concentration risk.`,
          },
          {
            priority: marketCount < 2 ? "HIGH" : "LOW",
            title: "Consider multi-market exposure",
            detail: `Portfolio is concentrated in ${Object.keys(marketMap).join(", ")} market${marketCount > 1 ? "s" : ""}. Adding international exposure can reduce geo-political risk.`,
          },
        ],
        riskAlerts: topHoldingAlloc > 40 ? [{
          severity: "HIGH",
          message: `Largest single position represents ${topHoldingAlloc.toFixed(1)}% of portfolio — consider rebalancing to limit single-stock risk.`,
        }] : [],
        diversificationScore,
        sectorExposure: Object.fromEntries(Object.entries(sectorMap).map(([k, v]) => [k, +(v / totalValue * 100).toFixed(1)])),
        marketExposure: Object.fromEntries(Object.entries(marketMap).map(([k, v]) => [k, +(v / totalValue * 100).toFixed(1)])),
        topOpportunity: holdings.reduce((best, h) => (h.changePercent ?? -999) > (best.changePercent ?? -999) ? h : best).sym,
        topRisk: holdings.reduce((worst, h) => (h.pnlPct ?? 999) < (worst.pnlPct ?? 999) ? h : worst).sym,
        generatedAt: new Date().toISOString(),
      };
    }

    res.json(analysis);
  } catch (err) {
    req.log.error({ err }, "portfolio analysis failed");
    res.status(502).json({ error: "portfolio analysis failed" });
  }
});

export default router;
