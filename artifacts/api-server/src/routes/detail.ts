import { Router } from "express";
import { getYF } from "../lib/yf";

const router = Router();

router.get("/stock/:symbol/detail", async (req, res) => {
  const { symbol } = req.params;

  try {
    const yf = await getYF();

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
    const keyStats = (summary.defaultKeyStatistics ?? {}) as Record<string, unknown>;
    const summaryDetail = (summary.summaryDetail ?? {}) as Record<string, unknown>;
    const recTrend = (summary.recommendationTrend ?? {}) as Record<string, unknown>;
    const trends = (recTrend.trend ?? []) as Record<string, unknown>[];
    const latestTrend = trends[0] ?? {};

    type NewsArticle = { title?: string; publisher?: string; link?: string; providerPublishTime?: number };
    const news: NewsArticle[] = (searchData.news ?? []) as NewsArticle[];

    function getRaw(obj: Record<string, unknown>, key: string): unknown {
      const v = obj[key];
      if (v && typeof v === "object" && "raw" in (v as object)) return (v as Record<string, unknown>).raw;
      return v;
    }

    res.json({
      quote: {
        symbol,
        price: getRaw(price, "regularMarketPrice"),
        change: getRaw(price, "regularMarketChange"),
        changePercent: getRaw(price, "regularMarketChangePercent"),
        previousClose: getRaw(price, "regularMarketPreviousClose"),
        open: getRaw(price, "regularMarketOpen"),
        dayHigh: getRaw(price, "regularMarketDayHigh"),
        dayLow: getRaw(price, "regularMarketDayLow"),
        volume: getRaw(price, "regularMarketVolume"),
        currency: price.currency,
        shortName: price.shortName ?? price.longName,
        exchange: price.exchangeName,
        marketState: price.marketState,
      },
      keyStats: {
        marketCap: getRaw(price, "marketCap"),
        pe: getRaw(summaryDetail, "trailingPE") ?? getRaw(keyStats, "trailingPE"),
        forwardPE: getRaw(summaryDetail, "forwardPE"),
        eps: getRaw(keyStats, "trailingEps"),
        beta: getRaw(summaryDetail, "beta"),
        week52High: getRaw(summaryDetail, "fiftyTwoWeekHigh"),
        week52Low: getRaw(summaryDetail, "fiftyTwoWeekLow"),
        avgVolume: getRaw(summaryDetail, "averageVolume"),
        dividendYield: getRaw(summaryDetail, "dividendYield"),
        bookValue: getRaw(keyStats, "bookValue"),
        priceToBook: getRaw(keyStats, "priceToBook"),
        shortFloat: getRaw(keyStats, "shortPercentOfFloat"),
      },
      financials: {
        totalRevenue: getRaw(finData, "totalRevenue"),
        profitMargin: getRaw(finData, "profitMargins"),
        operatingMargin: getRaw(finData, "operatingMargins"),
        returnOnEquity: getRaw(finData, "returnOnEquity"),
        returnOnAssets: getRaw(finData, "returnOnAssets"),
        debtToEquity: getRaw(finData, "debtToEquity"),
        currentRatio: getRaw(finData, "currentRatio"),
        revenueGrowth: getRaw(finData, "revenueGrowth"),
        earningsGrowth: getRaw(finData, "earningsGrowth"),
        targetMeanPrice: getRaw(finData, "targetMeanPrice"),
        targetHighPrice: getRaw(finData, "targetHighPrice"),
        targetLowPrice: getRaw(finData, "targetLowPrice"),
        numberOfAnalysts: getRaw(finData, "numberOfAnalystOpinions"),
        recommendation: finData.recommendationKey,
      },
      analysts: {
        strongBuy: latestTrend.strongBuy ?? 0,
        buy: latestTrend.buy ?? 0,
        hold: latestTrend.hold ?? 0,
        sell: latestTrend.sell ?? 0,
        strongSell: latestTrend.strongSell ?? 0,
        meanTarget: getRaw(finData, "targetMeanPrice"),
        highTarget: getRaw(finData, "targetHighPrice"),
        lowTarget: getRaw(finData, "targetLowPrice"),
      },
      news: news.slice(0, 12).map(n => ({
        title: n.title ?? "",
        publisher: n.publisher ?? "Unknown",
        link: n.link ?? "",
        publishedAt: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : null,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "stock detail fetch failed");
    res.status(502).json({ error: "stock detail fetch failed" });
  }
});

export default router;
