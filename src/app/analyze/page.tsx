"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Zap, Brain, AlertTriangle, CheckCircle } from "lucide-react";
import { InvestmentMemo, ResearchMode } from "@/types";
import MemoDisplay from "@/components/analysis/MemoDisplay";
import ClarifyDialog from "@/components/analysis/ClarifyDialog";

function AnalyzeSkeleton() {
    return (
        <div className="max-w-5xl mx-auto px-6 py-8 animate-pulse">
            <div className="flex items-center gap-4 mb-8">
                <div className="loading-shimmer h-8 w-8 rounded" />
                <div className="loading-shimmer h-6 w-48 rounded" />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[1, 2, 3].map(i => <div key={i} className="loading-shimmer h-24 rounded-xl" />)}
            </div>
            <div className="loading-shimmer h-64 rounded-xl mb-4" />
            <div className="loading-shimmer h-48 rounded-xl" />
        </div>
    );
}

function AnalyzeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const ticker = searchParams.get("ticker") || "";
    const query = searchParams.get("query") || "";
    const modeParam = (searchParams.get("mode") || "quick") as ResearchMode;

    const [phase, setPhase] = useState<"clarify" | "loading" | "done" | "error">(
        modeParam === "deep" ? "clarify" : "loading"
    );
    const [memo, setMemo] = useState<InvestmentMemo | null>(null);
    const [error, setError] = useState<string>("");
    const [statusMessage, setStatusMessage] = useState("Fetching financial data...");
    const [elapsedTime, setElapsedTime] = useState(0);

    const loadingSteps = [
        "Fetching financial data...",
        "Retrieving peer benchmarks...",
        "Synthesizing financial context...",
        "Running analytical reasoning...",
        "Building investment thesis...",
        "Generating investment memo...",
    ];

    const runAnalysis = async (context: Record<string, string> = {}) => {
        setPhase("loading");
        setElapsedTime(0);
        const startTime = Date.now();

        // Progress messages
        let step = 0;
        const interval = setInterval(() => {
            step = Math.min(step + 1, loadingSteps.length - 1);
            setStatusMessage(loadingSteps[step]);
            setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }, modeParam === "quick" ? 3500 : 20000);

        try {
            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ticker, mode: modeParam, userQuery: query, context }),
            });

            clearInterval(interval);

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Analysis failed");
            }

            const data: InvestmentMemo = await res.json();
            setMemo(data);
            setPhase("done");
        } catch (err) {
            clearInterval(interval);
            setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
            setPhase("error");
        }
    };

    useEffect(() => {
        if (!ticker || !query) {
            router.push("/");
            return;
        }
        if (modeParam === "quick") {
            runAnalysis();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (phase === "clarify") {
        return (
            <ClarifyDialog
                ticker={ticker}
                mode={modeParam}
                userQuery={query}
                onSubmit={runAnalysis}
                onSkip={() => runAnalysis()}
            />
        );
    }

    if (phase === "loading") {
        return (
            <div className="min-h-screen hero-bg flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-6">
                    <div className="relative w-20 h-20 mx-auto mb-8">
                        <div className="absolute inset-0 rounded-full border-2 border-yellow-400/20 animate-ping" />
                        <div className="absolute inset-2 rounded-full border-2 border-yellow-400/40 animate-pulse" />
                        <div className="absolute inset-4 rounded-full bg-yellow-400/10 flex items-center justify-center">
                            {modeParam === "quick" ? (
                                <Zap className="w-5 h-5 text-yellow-400" />
                            ) : (
                                <Brain className="w-5 h-5 text-yellow-400" />
                            )}
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        {modeParam === "quick" ? "Quick Analysis" : "Deep Analysis"} in Progress
                    </h2>
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <span className="font-mono font-bold text-yellow-400 text-lg">{ticker}</span>
                        <span className="text-[var(--text-muted)]">·</span>
                        <span className="text-[var(--text-secondary)] text-sm">{elapsedTime}s elapsed</span>
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm mb-8 min-h-[20px] transition-all">
                        {statusMessage}
                    </p>
                    <div className="flex flex-col gap-2">
                        {loadingSteps.map((step, i) => (
                            <div key={step} className={`flex items-center gap-2 text-xs transition-all ${i < loadingSteps.indexOf(statusMessage) ? "text-emerald-400" :
                                    step === statusMessage ? "text-yellow-400" : "text-[var(--text-muted)]"
                                }`}>
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i < loadingSteps.indexOf(statusMessage) ? "bg-emerald-400" :
                                        step === statusMessage ? "bg-yellow-400 animate-pulse" : "bg-[var(--text-muted)]"
                                    }`} />
                                {step.replace("...", "")}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (phase === "error") {
        return (
            <div className="min-h-screen hero-bg flex items-center justify-center">
                <div className="glass-card p-8 max-w-md w-full mx-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white mb-2">Analysis Failed</h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-6">{error}</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => runAnalysis()} className="btn-primary">Try Again</button>
                        <button onClick={() => router.push("/")} className="btn-secondary">Go Home</button>
                    </div>
                </div>
            </div>
        );
    }

    if (phase === "done" && memo) {
        return (
            <div className="min-h-screen hero-bg">
                {/* Header */}
                <div className="border-b border-[var(--border)] px-6 py-4">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <button
                            onClick={() => router.push("/")}
                            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors text-sm">
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                        <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-xl text-yellow-400">{memo.ticker}</span>
                            <span className="text-[var(--text-muted)]">·</span>
                            <span className="text-[var(--text-secondary)] text-sm">{memo.companyName}</span>
                            <span className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${memo.mode === "quick"
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                }`}>
                                {memo.mode === "quick" ? <Zap className="w-3 h-3" /> : <Brain className="w-3 h-3" />}
                                {memo.mode === "quick" ? "Quick" : "Deep"} Mode
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            Analysis complete
                        </div>
                    </div>
                </div>

                <MemoDisplay memo={memo} />
            </div>
        );
    }

    return <AnalyzeSkeleton />;
}

export default function AnalyzePage() {
    return (
        <Suspense fallback={<AnalyzeSkeleton />}>
            <AnalyzeContent />
        </Suspense>
    );
}
