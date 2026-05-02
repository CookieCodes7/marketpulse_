import { Router } from "express";
import OpenAI from "openai";
import { getYF } from "../lib/yf";

const router = Router();

router.get("/stock/:symbol/analysis", async (req, res) => {
  const { symbol } = req.params;

  try {
    const yf = await getYF();

    // Phase 1: get financials
    const [summaryRaw, searchRaw] = await Promise.allSettled([
      yf.quoteSummary(symbol, {
        modules: ["price", "financialData", "recommendationTrend", "defaultKeyStatistics", "summaryDetail"],
      } as object),
      yf.search(symbol, { newsCount: 15, enableFuzzyQuery: false } as object),
    ]);

    const summary = summaryRaw.status === "fulfilled" ? summaryRaw.value as Record<string, unknown> : {};
    const searchData = searchRaw.status === "fulfilled" ? searchRaw.value as Record<string, unknown> : {};

    const price = (summary.price ?? {}) as Record<string, unknown>;
    const finData = (summary.financialData ?? {}) as Record<string, unknown>;
    const summaryDetail = (summary.summaryDetail ?? {}) as Record<string, unknown>;
    const recTrend = (summary.recommendationTrend ?? {}) as Record<string, unknown>;
    const trends = (recTrend.trend ?? []) as Record<string, unknown>[];
    const latestTrend = trends[0] ?? {};

    type NewsArticle = { title?: string; publisher?: string; link?: string; providerPublishTime?: number };
    let news: NewsArticle[] = ((searchData.news ?? []) as NewsArticle[]).slice(0, 15);

    // Phase 2: if news is sparse, also search by company name for relevance
    const shortName = (price.shortName ?? price.longName ?? symbol) as string;
    if (news.length < 5 && shortName && shortName !== symbol) {
      try {
        const nameSearch = await yf.search(shortName.split(" ").slice(0, 2).join(" "), { newsCount: 10 } as object) as Record<string, unknown>;
        const nameNews = ((nameSearch.news ?? []) as NewsArticle[]).slice(0, 10);
        news = [...news, ...nameNews].filter((n, i, arr) => arr.findIndex(x => x.title === n.title) === i).slice(0, 15);
      } catch {
        // ignore
      }
    }

    function raw(obj: Record<string, unknown>, key: string): unknown {
      const v = obj[key];
      if (v && typeof v === "object" && "raw" in (v as object)) return (v as Record<string, unknown>).raw;
      return v;
    }

    const currentPrice = raw(price, "regularMarketPrice") as number;
    const prevClose = raw(price, "regularMarketPreviousClose") as number;
    const changeP = currentPrice && prevClose ? ((currentPrice - prevClose) / prevClose * 100) : 0;
    const week52High = raw(summaryDetail, "fiftyTwoWeekHigh") as number;
    const week52Low = raw(summaryDetail, "fiftyTwoWeekLow") as number;
    const targetMean = raw(finData, "targetMeanPrice") as number;
    const targetHigh = raw(finData, "targetHighPrice") as number;
    const targetLow = raw(finData, "targetLowPrice") as number;
    const recommendation = (finData.recommendationKey as string ?? "").toLowerCase();
    const numAnalysts = raw(finData, "numberOfAnalystOpinions") as number;
    const currency = (price.currency as string) ?? "USD";
    const buyCount = ((latestTrend.strongBuy as number) ?? 0) + ((latestTrend.buy as number) ?? 0);
    const holdCount = (latestTrend.hold as number) ?? 0;
    const sellCount = ((latestTrend.strongSell as number) ?? 0) + ((latestTrend.sell as number) ?? 0);

    const newsContext = news.length > 0
      ? news.map((n, i) => `[${i + 1}] Source: ${n.publisher ?? "Unknown"} — "${n.title ?? ""}"`).join("\n")
      : "No company-specific news found. Base analysis on analyst consensus and technical data only.";

    const prompt = `You are a senior equity research analyst at a top investment bank. Analyze ${shortName} (ticker: ${symbol}) and provide a JSON investment analysis.

LIVE MARKET DATA:
- Current Price: ${currency} ${currentPrice?.toFixed(2) ?? "N/A"} (${changeP >= 0 ? "+" : ""}${changeP?.toFixed(2) ?? "N/A"}% today)
- 52-Week Range: ${currency} ${week52Low?.toFixed(2) ?? "N/A"} – ${currency} ${week52High?.toFixed(2) ?? "N/A"}
- Analyst Price Targets: Mean ${currency} ${targetMean?.toFixed(2) ?? "N/A"}, High ${currency} ${targetHigh?.toFixed(2) ?? "N/A"}, Low ${currency} ${targetLow?.toFixed(2) ?? "N/A"} (${numAnalysts ?? 0} analysts)
- Consensus: ${recommendation} | Buy/Hold/Sell: ${buyCount}/${holdCount}/${sellCount}

RECENT NEWS SOURCES:
${newsContext}

Respond ONLY with a valid JSON object (no markdown, no code fences, no extra text) with exactly these fields:
{
  "signal": "BULLISH",
  "confidence": 78,
  "targetPrice": 1650.00,
  "targetCurrency": "${currency}",
  "reasoning": "2-3 sentences citing specific publishers from the news list above by name (e.g. 'According to Reuters...' or 'Bloomberg reports...'). If news is irrelevant, focus on analyst consensus.",
  "catalysts": ["Catalyst one", "Catalyst two", "Catalyst three"],
  "risks": ["Risk one", "Risk two"],
  "sources": ["Publisher1", "Publisher2", "Yahoo Finance Analysts"],
  "sentimentBreakdown": { "positive": 0.65, "negative": 0.15, "neutral": 0.20 },
  "technicalNote": "One sentence: price position vs 52-week range and what it signals."
}`;

    const openai = new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    });

    let analysisFromAI: Record<string, unknown> | null = null;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: "You are a senior equity analyst. Always respond with a single valid JSON object only. No markdown, no code blocks, no prose outside the JSON.",
          },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 1000,
      });

      const raw_text = (completion.choices[0]?.message?.content ?? "").trim();
      // Extract JSON — strip any accidental markdown fences
      const jsonText = raw_text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      if (jsonText.startsWith("{")) {
        analysisFromAI = JSON.parse(jsonText) as Record<string, unknown>;
      }
    } catch (aiErr) {
      req.log.warn({ aiErr }, "OpenAI call failed, using data-based fallback");
    }

    // Intelligent fallback based on real analyst data
    if (!analysisFromAI) {
      const upside = targetMean && currentPrice ? ((targetMean - currentPrice) / currentPrice * 100) : 0;
      const totalVotes = buyCount + holdCount + sellCount;
      const buyRatio = totalVotes > 0 ? buyCount / totalVotes : 0.5;
      const rec = recommendation;
      const signalFromData =
        rec.includes("strong_buy") || rec === "buy" || buyRatio > 0.65 ? "BULLISH"
        : rec.includes("strong_sell") || rec === "sell" || buyRatio < 0.25 ? "BEARISH"
        : "NEUTRAL";

      analysisFromAI = {
        signal: signalFromData,
        confidence: Math.round(Math.min(90, Math.max(45, buyRatio * 100))),
        targetPrice: targetMean ?? currentPrice,
        targetCurrency: currency,
        reasoning: `Based on ${numAnalysts ?? 0} analyst opinions with a ${rec || "hold"} consensus. ${
          upside > 0
            ? `Analyst price target implies ${upside.toFixed(1)}% upside from current levels.`
            : `Analyst price target implies ${Math.abs(upside).toFixed(1)}% downside from current levels.`
        } ${buyCount} analysts recommend buying vs ${holdCount} holds and ${sellCount} sells.`,
        catalysts: [
          upside > 10 ? `${upside.toFixed(0)}% upside to analyst consensus target` : "Analyst consensus price target",
          "Fundamental valuation support",
          week52High && currentPrice ? `Trading at ${((currentPrice / week52High) * 100).toFixed(0)}% of 52-week high` : "Technical positioning",
        ],
        risks: ["Market volatility and macro headwinds", "Execution risk on growth plans"],
        sources: [
          ...new Set(news.map(n => n.publisher ?? "Unknown").filter(Boolean)),
          ...(numAnalysts ? ["Yahoo Finance Analysts"] : []),
        ].filter(Boolean),
        sentimentBreakdown: {
          positive: totalVotes > 0 ? +((buyCount / totalVotes).toFixed(2)) : 0.5,
          neutral: totalVotes > 0 ? +((holdCount / totalVotes).toFixed(2)) : 0.3,
          negative: totalVotes > 0 ? +((sellCount / totalVotes).toFixed(2)) : 0.2,
        },
        technicalNote: week52High && week52Low && currentPrice
          ? `Trading at ${((currentPrice - week52Low) / (week52High - week52Low) * 100).toFixed(0)}% of 52-week range (low ${currency}${week52Low.toFixed(0)}, high ${currency}${week52High.toFixed(0)}).`
          : "Insufficient data for technical analysis.",
      };
    }

    res.json({ symbol, generatedAt: new Date().toISOString(), ...analysisFromAI });
  } catch (err) {
    req.log.error({ err }, "analysis failed");
    res.status(502).json({ error: "analysis generation failed" });
  }
});

export default router;
