import { NextRequest, NextResponse } from "next/server";
import { AnalyzeRequest } from "@/types";
import { getFinancialProfile, getMockCompanyMetrics } from "@/lib/financial-data";
import { getUserProfile, inferPreferencesFromQuery, updateUserProfile } from "@/lib/memory/user-profile";
import { saveAnalysis } from "@/lib/memory/history";
import { runQuickMode } from "@/lib/agents/quick-mode";
import { runDeepMode } from "@/lib/agents/deep-mode";

export async function POST(req: NextRequest) {
    try {
        const body: AnalyzeRequest = await req.json();
        const { ticker, mode, userQuery, peerTickers = [], context = {} } = body;

        if (!ticker || !mode || !userQuery) {
            return NextResponse.json({ error: "Missing required fields: ticker, mode, userQuery" }, { status: 400 });
        }

        const upperTicker = ticker.toUpperCase();

        // Get financial data
        const { metrics, defaultPeers, dataSource } = await getFinancialProfile(upperTicker);

        // Get user profile and infer updates from query
        const profile = getUserProfile();
        const profileUpdates = inferPreferencesFromQuery(userQuery, profile);
        const updatedProfile = Object.keys(profileUpdates).length > 0
            ? updateUserProfile(profileUpdates)
            : profile;

        let memo;

        if (mode === "quick") {
            memo = await runQuickMode(upperTicker, userQuery, metrics, updatedProfile, dataSource);
        } else {
            // Deep mode: load peer metrics
            const peersToLoad = peerTickers.length > 0 ? peerTickers : defaultPeers.slice(0, 3);
            const peerMetricsResults = await Promise.all(
                peersToLoad.map(async (pt: string) => {
                    try {
                        const { metrics: pm } = await getFinancialProfile(pt.toUpperCase());
                        return pm;
                    } catch {
                        return getMockCompanyMetrics(pt.toUpperCase());
                    }
                })
            );
            memo = await runDeepMode(
                upperTicker, userQuery, metrics, peerMetricsResults,
                updatedProfile, dataSource, context
            );
        }

        // Save to history
        saveAnalysis(memo);

        return NextResponse.json(memo);
    } catch (error) {
        console.error("[/api/analyze] Error:", error);
        const message = error instanceof Error ? error.message : "Analysis failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
