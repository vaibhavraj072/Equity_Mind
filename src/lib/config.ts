// ============================================================
// App Configuration
// ============================================================

export const config = {
    models: {
        quick: "google/gemini-2.0-flash-exp:free",
        deep: "anthropic/claude-3.5-sonnet",
        fallback: "openai/gpt-4o-mini",
    },
    openRouter: {
        baseUrl: "https://openrouter.ai/api/v1",
        siteUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        siteName: "EquityMind AI",
    },
    finnhub: {
        baseUrl: "https://finnhub.io/api/v1",
    },
    alphaVantage: {
        baseUrl: "https://www.alphavantage.co/query",
    },
    timeouts: {
        quick: 30_000,
        deep: 180_000,
    },
    defaultUserProfile: {
        riskTolerance: "moderate" as const,
        preferredKPIs: ["Revenue Growth", "EBITDA", "Free Cash Flow"],
        sectorsOfInterest: ["Technology", "Healthcare"],
        geographicFocus: ["United States"],
        investmentHorizon: "medium" as const,
    },
    dataFiles: {
        userProfile: "./data/user-profile.json",
        history: "./data/history.json",
    },
};
