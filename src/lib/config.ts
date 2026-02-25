// ============================================================
// App Configuration
// ============================================================

export const config = {
    models: {
        // Google Gemini — via Google AI Studio API (OpenAI-compatible endpoint)
        quick: "gemini-2.0-flash",           // fast, generous free quota
        deep: "gemini-2.5-pro-exp-03-25",   // best reasoning
        fallback: "gemini-1.5-flash",           // always-on stable fallback
    },
    openRouter: {
        // Kept for siteName reference used in llm-client headers
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
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
        preferredKPIs: ["Revenue Growth", "EBITDA", "Free Cash Flow", "Debt/Equity"],
        sectorsOfInterest: ["Information Technology", "Banking & Finance", "FMCG", "Pharma"],
        geographicFocus: ["India", "NSE", "BSE"],
        investmentHorizon: "medium" as const,
    },
    dataFiles: {
        userProfile: "./data/user-profile.json",
        history: "./data/history.json",
    },
};
