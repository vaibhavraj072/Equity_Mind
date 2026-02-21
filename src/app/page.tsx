"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Zap, Brain, TrendingUp, Shield, ChevronRight, Clock, BarChart2 } from "lucide-react";
import { ResearchMode, AnalysisHistoryItem } from "@/types";

const POPULAR_TICKERS = [
    { ticker: "AAPL", name: "Apple Inc." },
    { ticker: "MSFT", name: "Microsoft" },
    { ticker: "GOOGL", name: "Alphabet" },
    { ticker: "NVDA", name: "NVIDIA" },
    { ticker: "AMZN", name: "Amazon" },
    { ticker: "META", name: "Meta" },
    { ticker: "TSLA", name: "Tesla" },
    { ticker: "JNJ", name: "J&J" },
];

const EXAMPLE_QUERIES = [
    "Analyze Apple's revenue growth and FCF generation",
    "Compare NVDA vs AMD on fundamentals",
    "Stress test Microsoft under a rate hike scenario",
    "What's the bull and bear case for TSLA?",
    "Assess JNJ's dividend sustainability",
];

export default function HomePage() {
    const router = useRouter();
    const [ticker, setTicker] = useState("");
    const [query, setQuery] = useState("");
    const [mode, setMode] = useState<ResearchMode>("quick");
    const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetch("/api/history")
            .then((r) => r.json())
            .then((data) => Array.isArray(data) && setHistory(data.slice(0, 5)))
            .catch(() => { });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticker.trim() || !query.trim()) return;
        const params = new URLSearchParams({
            ticker: ticker.toUpperCase(),
            query: query,
            mode,
        });
        router.push(`/analyze?${params.toString()}`);
    };

    const handleQuickTicker = (t: string) => {
        setTicker(t);
        setQuery(`Analyze ${t} — key metrics, performance, and risks`);
    };

    return (
        <div className="min-h-screen hero-bg">
            {/* Navigation */}
            <nav className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                        <BarChart2 className="w-4 h-4 text-slate-900" />
                    </div>
                    <span className="text-lg font-bold text-white">EquityMind AI</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 font-medium">BETA</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">Explain. Compare. Justify.</span>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 pt-20 pb-32">
                {/* Hero */}
                <div className="text-center mb-12 animate-fade-in">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
                        style={{ background: "rgba(232,180,0,0.08)", border: "1px solid rgba(232,180,0,0.2)" }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                        <span className="text-xs font-medium text-yellow-400">AI-Powered Equity Research</span>
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-5 leading-tight">
                        Your AI{" "}
                        <span className="gold-gradient">Equity Analyst</span>
                    </h1>
                    <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
                        Not a chatbot. A structured financial reasoning engine that synthesizes data,
                        builds investment theses, and generates professional-grade memos.
                    </p>
                </div>

                {/* Main Search Form */}
                <div className="glass-card p-6 mb-6 animate-slide-up">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {/* Mode Selector */}
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setMode("quick")}
                                className={`flex-1 flex items-center gap-2.5 p-3.5 rounded-xl border transition-all ${mode === "quick"
                                        ? "border-yellow-400/40 bg-yellow-400/8 text-yellow-400"
                                        : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-bright)]"
                                    }`}
                                style={mode === "quick" ? { background: "rgba(232,180,0,0.06)" } : {}}>
                                <Zap className="w-4 h-4 flex-shrink-0" />
                                <div className="text-left">
                                    <div className="text-sm font-semibold">Quick Mode</div>
                                    <div className="text-xs opacity-70">&lt; 30s · KPIs + Risks</div>
                                </div>
                            </button>
                            <button type="button" onClick={() => setMode("deep")}
                                className={`flex-1 flex items-center gap-2.5 p-3.5 rounded-xl border transition-all ${mode === "deep"
                                        ? "border-yellow-400/40 text-yellow-400"
                                        : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-bright)]"
                                    }`}
                                style={mode === "deep" ? { background: "rgba(232,180,0,0.06)" } : {}}>
                                <Brain className="w-4 h-4 flex-shrink-0" />
                                <div className="text-left">
                                    <div className="text-sm font-semibold">Deep Mode</div>
                                    <div className="text-xs opacity-70">&lt; 3min · Full Memo</div>
                                </div>
                            </button>
                        </div>

                        {/* Ticker + Query Row */}
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={ticker}
                                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                                placeholder="AAPL"
                                maxLength={6}
                                className="search-input font-mono font-bold text-yellow-400 uppercase"
                                style={{ width: "110px", flexShrink: 0, textAlign: "center", letterSpacing: "0.1em" }}
                            />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="What do you want to analyze? e.g. 'Assess FCF and valuation'"
                                className="search-input flex-1"
                            />
                            <button type="submit" disabled={!ticker || !query || isLoading} className="btn-primary whitespace-nowrap">
                                {isLoading ? (
                                    <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                                Analyze
                            </button>
                        </div>

                        {/* Example queries */}
                        <div className="flex flex-wrap gap-2">
                            {EXAMPLE_QUERIES.map((q, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                        const parts = q.match(/([A-Z]{2,5})/);
                                        if (parts) setTicker(parts[1]);
                                        setQuery(q);
                                    }}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] 
                    hover:text-[var(--text-secondary)] hover:border-[var(--border-bright)] transition-all truncate max-w-[240px]">
                                    {q}
                                </button>
                            ))}
                        </div>
                    </form>
                </div>

                {/* Popular Tickers */}
                <div className="mb-10">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Popular tickers</p>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {POPULAR_TICKERS.map(({ ticker: t, name }) => (
                            <button
                                key={t}
                                onClick={() => handleQuickTicker(t)}
                                className="flex flex-col items-center p-3 rounded-xl border border-[var(--border)] 
                  hover:border-yellow-400/30 hover:bg-yellow-400/5 transition-all group">
                                <span className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors font-mono">{t}</span>
                                <span className="text-[10px] text-[var(--text-muted)] mt-0.5 hidden sm:block truncate w-full text-center">{name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                    {[
                        { icon: <TrendingUp className="w-5 h-5" />, title: "Structured Memos", desc: "9-section investment memos with bull/bear thesis, scenarios, and peer comparisons" },
                        { icon: <Brain className="w-5 h-5" />, title: "Financial Memory", desc: "Remembers your risk tolerance, preferred KPIs, and sector interests across sessions" },
                        { icon: <Shield className="w-5 h-5" />, title: "Contradiction Detection", desc: "Flags discrepancies between management claims and reported financial results" },
                    ].map(({ icon, title, desc }) => (
                        <div key={title} className="glass-card p-4">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 text-yellow-400"
                                style={{ background: "rgba(232,180,0,0.08)", border: "1px solid rgba(232,180,0,0.15)" }}>
                                {icon}
                            </div>
                            <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>

                {/* Recent History */}
                {history.length > 0 && (
                    <div>
                        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Recent Analyses
                        </p>
                        <div className="glass-card divide-y divide-[var(--border)]">
                            {history.map((item) => (
                                <a
                                    key={item.id}
                                    href={`/analyze?ticker=${item.ticker}&query=Re-analyze+${item.ticker}&mode=${item.mode}`}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-white/2 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold text-sm text-yellow-400">{item.ticker}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${item.mode === "quick" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                                            }`}>{item.mode}</span>
                                        <span className={`text-xs ${item.overallSentiment === "bullish" ? "text-emerald-400" :
                                                item.overallSentiment === "bearish" ? "text-red-400" : "text-yellow-400"
                                            }`}>{item.overallSentiment}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-[var(--text-muted)]">
                                            {new Date(item.analysisDate).toLocaleDateString()}
                                        </span>
                                        <span className="text-xs text-[var(--text-secondary)]">{item.confidenceScore}% confidence</span>
                                        <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
