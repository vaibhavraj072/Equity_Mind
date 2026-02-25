import { UserMemoryProfile, FinancialMetrics, ResearchMode } from "@/types";

export function getSystemPrompt(mode: ResearchMode, profile: UserMemoryProfile): string {
  const kpiStr = profile.preferredKPIs.join(", ");
  const sectorsStr = profile.sectorsOfInterest.join(", ");

  const personalization = [
    `Risk Tolerance: ${profile.riskTolerance}`,
    `Preferred KPIs: ${kpiStr}`,
    `Sectors: ${sectorsStr}`,
    `Horizon: ${profile.investmentHorizon}`,
    `Geography: ${profile.geographicFocus.join(", ")}`,
  ].join(" | ");

  if (mode === "quick") {
    // ── Compact system prompt: ~60 tokens (was ~200) ─────────────────────
    return (
      "You are EquityMind AI, a senior equity analyst. " +
      "Produce a QUICK MODE JSON analysis of a stock. " +
      `Focus KPIs: ${kpiStr}. ${personalization}. ` +
      "Rules: cite specific numbers, be concise, return ONLY valid JSON — no markdown fences."
    );
  }

  // Deep Mode — detailed, full context
  return (
    "You are EquityMind AI, a senior equity research analyst with 20+ years experience.\n\n" +
    `User Profile: ${personalization}\n\n` +
    "DEEP MODE RULES:\n" +
    "1. Comprehensive fundamental analysis\n" +
    "2. Rigorous bull AND bear thesis with evidence\n" +
    "3. Compare against 2-3 industry peers with specific metrics\n" +
    "4. Scenario analysis (bull/base/bear) with explicit assumptions\n" +
    "5. Flag contradictions between management commentary and results\n" +
    "6. Every conclusion must cite specific numbers\n" +
    "7. Assign confidence score based on data completeness\n\n" +
    "Structure as valid JSON matching InvestmentMemo schema exactly. " +
    "Philosophy: Explain every assumption. Compare to peers. Justify every conclusion."
  );
}

export function getFinancialContextPrompt(
  metrics: FinancialMetrics,
  peerMetrics?: Partial<FinancialMetrics>[],
  dataSource: "live" | "mock" = "mock"
): string {
  const fmt = (n?: number, prefix = "", suffix = "") =>
    n != null ? `${prefix}${n.toLocaleString()}${suffix}` : "N/A";

  const metricsStr = [
    `COMPANY: ${metrics.companyName} (${metrics.ticker}) | ${metrics.sector} / ${metrics.industry}`,
    `Data: ${dataSource === "live" ? "Live API" : "Reference Data"}`,
    "",
    "VALUATION",
    `Price: ${fmt(metrics.currentPrice, "$")} | MCap: ${metrics.marketCap ? "$" + (metrics.marketCap / 1e9).toFixed(1) + "B" : "N/A"}`,
    `P/E: ${fmt(metrics.peRatio, "", "x")} | P/B: ${fmt(metrics.pbRatio, "", "x")} | P/S: ${fmt(metrics.psRatio, "", "x")} | EV/EBITDA: ${fmt(metrics.evToEbitda, "", "x")}`,
    `EPS: ${fmt(metrics.eps, "$")} | 52W: ${fmt(metrics.fiftyTwoWeekLow, "$")}–${fmt(metrics.fiftyTwoWeekHigh, "$")} | Beta: ${fmt(metrics.beta)}`,
    "",
    "PROFITABILITY",
    `Rev: ${metrics.revenue ? "$" + (metrics.revenue / 1e9).toFixed(1) + "B" : "N/A"} (+${fmt(metrics.revenueGrowthYoY, "", "%")} YoY)`,
    `Gross Margin: ${fmt(metrics.grossMargin, "", "%")} | Op Margin: ${fmt(metrics.operatingMargin, "", "%")} | Net Margin: ${fmt(metrics.netMargin, "", "%")}`,
    `EBITDA: ${metrics.ebitda ? "$" + (metrics.ebitda / 1e9).toFixed(1) + "B" : "N/A"}`,
    "",
    "RETURNS & BALANCE SHEET",
    `ROE: ${fmt(metrics.roe, "", "%")} | ROA: ${fmt(metrics.roa, "", "%")} | FCF: ${metrics.freeCashFlow ? "$" + (metrics.freeCashFlow / 1e9).toFixed(1) + "B" : "N/A"}`,
    `D/E: ${fmt(metrics.debtToEquity, "", "x")} | Current Ratio: ${fmt(metrics.currentRatio, "", "x")} | Div Yield: ${fmt(metrics.dividendYield, "", "%")}`,
  ].join("\n");

  let peerStr = "";
  if (peerMetrics && peerMetrics.length > 0) {
    peerStr = "\n\nPEER COMPARISON\n";
    for (const peer of peerMetrics) {
      peerStr += `${peer.ticker}: P/E=${fmt(peer.peRatio, "", "x")}, RevGrowth=${fmt(peer.revenueGrowthYoY, "", "%")}, Margin=${fmt(peer.ebitdaMargin, "", "%")}, ROE=${fmt(peer.roe, "", "%")}, D/E=${fmt(peer.debtToEquity, "", "x")}\n`;
    }
  }

  return metricsStr + peerStr;
}

// ── Full schema for Deep Mode  (~1500 tokens) ─────────────────────────────────
export function getMemoSchema(): string {
  return `Return ONLY a JSON object (no markdown, no extra text):
{
  "id": "<uuid>",
  "ticker": "<TICKER>",
  "companyName": "<Full Company Name>",
  "analysisDate": "<ISO date>",
  "mode": "quick" | "deep",
  "userQuery": "<original user query>",
  "overallSentiment": "bullish" | "bearish" | "neutral",
  "businessOverview": {
    "summary": "<2-3 sentence business description>",
    "coreProducts": ["<product1>", "<product2>"],
    "competitiveAdvantages": ["<moat1>", "<moat2>"],
    "managementHighlights": "<optional string>"
  },
  "financialPerformance": {
    "summary": "<2-3 sentence financial summary>",
    "highlights": ["<positive highlight 1>", "<positive highlight 2>"],
    "concerns": ["<concern 1>"],
    "metrics": {}
  },
  "peerComparison": [
    { "ticker": "PEER1", "companyName": "...", "peRatio": 0, "revenueGrowthYoY": 0, "grossMargin": 0, "roe": 0, "debtToEquity": 0, "marketCap": 0 }
  ],
  "bullThesis": {
    "points": ["<bull point 1>", "<bull point 2>", "<bull point 3>"],
    "keyMetrics": ["<metric that supports bull case>"],
    "catalysts": ["<upcoming catalyst>"]
  },
  "bearThesis": {
    "points": ["<bear point 1>", "<bear point 2>"],
    "keyMetrics": ["<metric that supports bear case>"],
    "catalysts": ["<risk that could accelerate bear case>"]
  },
  "keyRisks": [
    { "risk": "<risk description>", "severity": "high" | "medium" | "low", "mitigation": "<optional>" }
  ],
  "scenarioAnalysis": {
    "bull": { "revenueGrowth": 0, "marginExpansion": 0, "impliedValue": "<price target>", "keyDriver": "<what drives bull>", "probability": 30 },
    "base": { "revenueGrowth": 0, "marginExpansion": 0, "impliedValue": "<price target>", "keyDriver": "<consensus>", "probability": 50 },
    "bear": { "revenueGrowth": 0, "marginExpansion": 0, "impliedValue": "<price target>", "keyDriver": "<what drives bear>", "probability": 20 },
    "sensitivityNote": "<note on key variables>"
  },
  "valuationInsight": {
    "summary": "<valuation commentary>",
    "methodology": "<DCF / Comps / etc.>",
    "fairValueRange": "<$X - $Y>",
    "currentPriceVsFairValue": "undervalued" | "fairly valued" | "overvalued",
    "note": "<optional caveat>"
  },
  "confidenceScore": {
    "overall": 0,
    "dataCompleteness": 0,
    "sourceReliability": 0,
    "contradictionPenalty": 0,
    "label": "Low" | "Medium" | "High" | "Very High",
    "explanation": "<why this score>"
  },
  "discrepancies": [
    { "category": "earnings" | "guidance" | "growth" | "risk" | "other", "claim": "<mgmt said>", "evidence": "<data shows>", "severity": "high" | "medium" | "low" }
  ],
  "assumptions": ["<assumption 1>", "<assumption 2>"],
  "dataSourcesUsed": ["Finnhub", "Alpha Vantage", "Public Filings"],
  "nextStepsRecommended": ["<follow-up suggestion>"]
}`;
}

// ── LEAN schema for Quick Scan (~300 tokens vs ~1500 for full) ────────────────
// All required InvestmentMemo fields are present; non-critical ones use defaults.
export function getQuickMemoSchema(): string {
  return `Return ONLY a valid JSON object. No markdown code fences. No extra text before or after the JSON.
Required structure:
{
  "id": "generate-a-uuid-here",
  "ticker": "TICKER_SYMBOL",
  "companyName": "Full Company Name",
  "analysisDate": "2026-02-25",
  "mode": "quick",
  "userQuery": "the user query text",
  "overallSentiment": "bullish",
  "businessOverview": { "summary": "2 sentence description", "coreProducts": ["product1"], "competitiveAdvantages": ["moat1"] },
  "financialPerformance": { "summary": "2 sentences with specific numbers", "highlights": ["highlight1", "highlight2"], "concerns": ["concern1"], "metrics": {} },
  "peerComparison": [],
  "bullThesis": { "points": ["bull point 1", "bull point 2"], "keyMetrics": [], "catalysts": [] },
  "bearThesis": { "points": ["risk 1"], "keyMetrics": [], "catalysts": [] },
  "keyRisks": [{ "risk": "description", "severity": "medium", "mitigation": "" }],
  "scenarioAnalysis": { "bull": { "revenueGrowth": 15, "marginExpansion": 2, "impliedValue": "N/A", "keyDriver": "", "probability": 30 }, "base": { "revenueGrowth": 8, "marginExpansion": 0, "impliedValue": "N/A", "keyDriver": "", "probability": 50 }, "bear": { "revenueGrowth": 2, "marginExpansion": -2, "impliedValue": "N/A", "keyDriver": "", "probability": 20 }, "sensitivityNote": "" },
  "valuationInsight": { "summary": "one sentence valuation view", "methodology": "Comps", "fairValueRange": "N/A", "currentPriceVsFairValue": "fairly valued", "note": "" },
  "confidenceScore": { "overall": 70, "dataCompleteness": 70, "sourceReliability": 70, "contradictionPenalty": 0, "label": "Medium", "explanation": "Based on reference data" },
  "discrepancies": [],
  "assumptions": ["Based on reference financial data"],
  "dataSourcesUsed": ["Reference Data"],
  "nextStepsRecommended": ["Run Deep Mode for comprehensive analysis"]
}`;
}

export function getClarifyPrompt(ticker: string, mode: ResearchMode, userQuery: string): string {
  return `You are EquityMind AI. A user wants a ${mode.toUpperCase()} MODE analysis of ${ticker}.

User Query: "${userQuery}"

Generate 2-3 targeted clarifying questions to sharpen the analysis. Focus on:
- Time horizon (short/medium/long-term)
- Specific metrics they care about most
- Peer companies to include in comparison
- Specific risks or scenarios to stress-test

Return ONLY a JSON array of question objects:
[
  {
    "id": "q1",
    "question": "<question text>",
    "type": "select",
    "options": ["<option1>", "<option2>", "<option3>"]
  }
]
Types can be: "text", "select", "multiselect"`;
}
