import { NextRequest, NextResponse } from "next/server";
import { AnalyzeRequest } from "@/types";
import { getFinancialProfile, getMockCompanyMetrics } from "@/lib/financial-data";
import { getUserProfile, inferPreferencesFromQuery, updateUserProfile } from "@/lib/memory/user-profile";
import { saveAnalysis } from "@/lib/memory/history";
import { runQuickMode } from "@/lib/agents/quick-mode";
import { runDeepMode } from "@/lib/agents/deep-mode";

/**
 * Allow up to 180 seconds for deep mode analysis on Vercel / serverless.
 * This matches the problem-statement requirement: max 3 minutes for Deep Mode.
 */
export const maxDuration = 180;

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
            // Deep mode: load peer metrics in parallel
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

            /**
             * Race the deep-mode call against a 175 s hard ceiling.
             * This ensures the route always resolves before Next.js / Vercel
             * cuts the connection at 180 s (maxDuration above).
             */
            const DEEP_ROUTE_TIMEOUT_MS = 175_000;
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(
                    () => reject(new Error("Deep mode timed out after 175 s")),
                    DEEP_ROUTE_TIMEOUT_MS
                )
            );

            memo = await Promise.race([
                runDeepMode(
                    upperTicker, userQuery, metrics, peerMetricsResults,
                    updatedProfile, dataSource, context
                ),
                timeoutPromise,
            ]);
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
