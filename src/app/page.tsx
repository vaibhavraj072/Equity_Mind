"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ResearchMode } from "@/types";
import {
    Zap, Brain, TrendingUp, TrendingDown, Search,
    BarChart2, Clock, Shield, ChevronRight, Activity
} from "lucide-react";

interface TickerItem {
    symbol: string;
    name: string;
    price: string;
    change: string;
    changePercent: string;
    up: boolean;
    region: string;
}

// Placeholder shown while first fetch is in-flight
const LOADING_TICKERS: TickerItem[] = Array.from({ length: 12 }, () => ({
    symbol: "------", name: "------",
    price: "---", change: "---", changePercent: "---",
    up: true, region: "IN",
}));

// ── Candlestick data — deterministic (no Math.random = no hydration mismatch) ──
const CANDLES = Array.from({ length: 40 }, (_, i) => ({
    height: 30 + Math.abs(Math.sin(i * 0.7) * 50) + ((i * 17 + 31) % 80),
    wick: 10 + ((i * 13) % 40),
    up: (i * 7 + 3) % 10 > 3,
    delay: i * 0.15,
}));

// ── Mode configs ────────────────────────────────────────────
const MODES = {
    quick: {
        label: "Quick Scan",
        icon: <Zap className="w-5 h-5" />,
        badge: "< 30 sec",
        color: "cyan",
        tagline: "Instant signal. Zero noise.",
        desc: "One-pass AI synthesis. KPIs, risks, and a clear verdict — in under 30 seconds.",
        queries: [
            "Is RELIANCE overvalued after the rally?",
            "TCS free cash flow trend & margin analysis",
            "Compare INFY and WIPRO operating margins",
        ],
    },
    deep: {
        label: "Deep Research",
        icon: <Brain className="w-5 h-5" />,
        badge: "< 3 min",
        color: "purple",
        tagline: "Full analyst-grade memo.",
        desc: "Multi-step reasoning across financials, peers, scenarios, and valuation. Every angle covered.",
        queries: [
            "Build a full investment case for HDFCBANK",
            "BAJFINANCE bear vs bull thesis with scenario analysis",
            "Is ZOMATO a value trap or a compounding machine?",
        ],
    },
} as const;

const POPULAR = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "WIPRO", "SBIN", "BAJFINANCE"];

// ── The Page ────────────────────────────────────────────────
export default function HomePage() {
    const router = useRouter();
    const [mode, setMode] = useState<ResearchMode>("quick");
    const [ticker, setTicker] = useState("");
    const [query, setQuery] = useState("");
    const [tickers, setTickers] = useState<TickerItem[]>(LOADING_TICKERS);
    const [tickerSrc, setTickerSrc] = useState<"live" | "fallback" | "loading">("loading");
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<Array<{ ticker: string; query: string; mode: string; date: string }>>([]);
    const [timeStr, setTimeStr] = useState("");  // client-only
    const [marketOpen, setMarketOpen] = useState(false); // IST market hours
    const tickerRef = useRef<HTMLInputElement>(null);

    // ── Fetch live market data from /api/ticker-data ──
    const fetchTickers = useCallback(async () => {
        try {
            const res = await fetch("/api/ticker-data");
            if (!res.ok) return;
            const data = await res.json();
            setTickers(data.tickers ?? []);
            setTickerSrc(data.source ?? "live");
        } catch { /* retain previous data on network error */ }
    }, []);

    useEffect(() => {
        fetchTickers(); // initial load
        const id = setInterval(fetchTickers, 30_000); // refresh every 30s
        return () => clearInterval(id);
    }, [fetchTickers]);

    const cfg = MODES[mode];

    // Apply theme to <html> data-mode attribute
    useEffect(() => {
        document.documentElement.dataset.mode = mode;
    }, [mode]);

    // Clock — client-side only to avoid hydration mismatch
    useEffect(() => {
        // IST = UTC + 5h30m
        function isNSEOpen(): boolean {
            const now = new Date();
            const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
            const ist = new Date(utcMs + 5.5 * 60 * 60_000);
            const day = ist.getDay(); // 0=Sun, 6=Sat
            if (day === 0 || day === 6) return false;
            const hhmm = ist.getHours() * 100 + ist.getMinutes();
            return hhmm >= 915 && hhmm < 1530; // 9:15 AM – 3:30 PM IST
        }
        const tick = () => {
            setTimeStr(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }));
            setMarketOpen(isNSEOpen());
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    // Load recent history
    useEffect(() => {
        fetch("/api/history")
            .then(r => r.json())
            .then(d => setHistory((d.history || []).slice(0, 4)))
            .catch(() => { });
    }, []);

    function handleModeSwitch(m: ResearchMode) {
        setMode(m);
        // brief flash effect
        document.documentElement.classList.add("mode-switch");
        setTimeout(() => document.documentElement.classList.remove("mode-switch"), 600);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!ticker.trim()) { tickerRef.current?.focus(); return; }
        const q = query.trim() || `Analyze ${ticker.toUpperCase()}`;
        setLoading(true);
        router.push(`/analyze?ticker=${encodeURIComponent(ticker.toUpperCase())}&query=${encodeURIComponent(q)}&mode=${mode}`);
    }

    function fillQuery(q: string) { setQuery(q); }
    function fillTicker(t: string) { setTicker(t); }

    return (
        <>
            {/* ── Ambient background ── */}
            <div className="bg-grid" aria-hidden />
            <div className="bg-orb bg-orb-1" aria-hidden />
            <div className="bg-orb bg-orb-2" aria-hidden />
            <div className="bg-orb bg-orb-3" aria-hidden />

            {/* Candlestick bars */}
            <div className="bg-candles" aria-hidden>
                {CANDLES.map((c, i) => (
                    <div key={i} className="bg-candle" style={{ animationDelay: `${c.delay}s` }}>
                        <div className="bg-candle-wick" style={{ height: `${c.wick}px`, opacity: c.up ? 1 : 0.5 }} />
                        <div
                            className="bg-candle-body"
                            style={{
                                height: `${c.height}px`,
                                background: c.up ? "var(--bull)" : "var(--bear)",
                                opacity: c.up ? 0.9 : 0.7,
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* ── App shell ── */}
            <div className="app-shell">

                {/* ── Ticker tape ── */}
                <div style={{
                    background: "rgba(0,0,0,0.75)",
                    borderBottom: "1px solid var(--border)",
                    padding: "7px 0",
                    overflow: "hidden",
                    backdropFilter: "blur(8px)",
                    position: "relative",
                }}>
                    {/* Live badge */}
                    <div style={{
                        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                        zIndex: 2, display: "flex", alignItems: "center", gap: 5,
                        background: "rgba(0,0,0,0.8)", padding: "3px 8px", borderRadius: 4,
                        border: "1px solid var(--border)",
                    }}>
                        {tickerSrc === "live" ? (
                            <><span className="live-dot" style={{ width: 6, height: 6 }} />
                                <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--bull)", letterSpacing: "0.08em" }}>LIVE</span></>
                        ) : tickerSrc === "loading" ? (
                            <span style={{ fontSize: "0.6rem", color: "var(--text-3)", letterSpacing: "0.05em" }}>LOADING…</span>
                        ) : (
                            <span style={{ fontSize: "0.6rem", color: "var(--text-3)", letterSpacing: "0.05em" }}>SNAPSHOT</span>
                        )}
                    </div>
                    {/* Fade edges */}
                    <div style={{
                        position: "absolute", left: 0, top: 0, bottom: 0, width: 60,
                        background: "linear-gradient(to right, rgba(0,0,0,0.8), transparent)", zIndex: 1, pointerEvents: "none"
                    }} />
                    <div style={{
                        position: "absolute", right: 0, top: 0, bottom: 0, width: 120,
                        background: "linear-gradient(to left, rgba(0,0,0,0.8), transparent)", zIndex: 1, pointerEvents: "none"
                    }} />

                    <div style={{ display: "flex", overflow: "hidden" }}>
                        <div className="ticker-tape">
                            {/* Duplicate for seamless loop */}
                            {[...tickers, ...tickers].map((t, i) => (
                                <span key={i} style={{
                                    display: "inline-flex", alignItems: "center",
                                    gap: 6, padding: "0 20px", fontSize: "0.78rem",
                                    whiteSpace: "nowrap",
                                }}>
                                    {/* Region badge */}
                                    {t.region === "IN" && (
                                        <span style={{
                                            fontSize: "0.55rem", padding: "1px 4px", borderRadius: 3,
                                            background: "rgba(255,153,51,0.15)", color: "#ff9933",
                                            fontWeight: 700, letterSpacing: "0.05em", border: "1px solid rgba(255,153,51,0.2)"
                                        }}>IN</span>
                                    )}
                                    {t.region === "FX" && (
                                        <span style={{
                                            fontSize: "0.55rem", padding: "1px 4px", borderRadius: 3,
                                            background: "rgba(99,120,180,0.15)", color: "var(--text-2)",
                                            fontWeight: 700, letterSpacing: "0.05em", border: "1px solid var(--border)"
                                        }}>FX</span>
                                    )}
                                    <span style={{
                                        fontWeight: 700, fontFamily: "var(--font-mono, monospace)",
                                        color: "var(--text-1)", letterSpacing: "0.05em"
                                    }}>{t.name}</span>
                                    <span style={{ color: "var(--text-3)", fontFamily: "var(--font-mono, monospace)" }}>{t.price}</span>
                                    <span style={{ color: t.up ? "var(--bull)" : "var(--bear)", fontWeight: 600, fontFamily: "var(--font-mono, monospace)" }}>
                                        {t.up ? "▲" : "▼"} {t.changePercent}
                                    </span>
                                    <span style={{ color: "var(--border-hi)", fontSize: "0.55rem" }}>│</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Navbar ── */}
                <nav style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "18px 48px", borderBottom: "1px solid var(--border)",
                    background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)",
                    position: "sticky", top: 0, zIndex: 50,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: "var(--accent-dim)", border: "1px solid var(--accent-border)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 0 16px var(--accent-glow)",
                            transition: "all 0.6s",
                        }}>
                            <BarChart2 style={{ width: 18, height: 18, color: "var(--accent)" }} />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
                            <span className="glow-text">Equity</span>
                            <span style={{ color: "var(--text-1)" }}>Mind</span>
                        </span>
                        <span style={{
                            fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em",
                            padding: "2px 8px", borderRadius: 4,
                            background: "var(--accent-dim)", border: "1px solid var(--accent-border)",
                            color: "var(--accent)", textTransform: "uppercase",
                            transition: "all 0.6s",
                        }}>AI</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: "0.85rem" }}>
                        {/* Market status — IST-aware */}
                        <span
                            className={marketOpen ? "live-dot" : undefined}
                            style={!marketOpen ? {
                                display: "inline-block", width: 8, height: 8,
                                borderRadius: "50%", background: "var(--text-3)",
                            } : {}}
                        />
                        <a
                            href={marketOpen ? "https://www.nseindia.com" : "https://www.bseindia.com"}
                            target="_blank"
                            rel="noopener noreferrer"
                            suppressHydrationWarning
                            style={{
                                color: marketOpen ? "var(--bull)" : "var(--text-3)",
                                textDecoration: "none",
                                fontWeight: 600,
                                transition: "opacity 0.15s",
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.7"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                        >
                            {marketOpen ? "NSE/BSE Open" : "Markets Closed"}
                        </a>
                        <span style={{ color: "var(--text-3)" }}>|</span>
                        <span style={{ color: "var(--text-2)" }} suppressHydrationWarning>
                            {timeStr ? `Last updated: ${timeStr}` : ""}
                        </span>
                    </div>
                </nav>

                {/* ── Hero ── */}
                <main style={{ maxWidth: 860, margin: "0 auto", padding: "72px 24px 40px" }}>

                    {/* Badge */}
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }} className="animate-fiu">
                        <div style={{
                            display: "inline-flex", alignItems: "center", gap: 8,
                            padding: "6px 16px", borderRadius: 99,
                            background: "var(--accent-dim)", border: "1px solid var(--accent-border)",
                            fontSize: "0.78rem", fontWeight: 600, color: "var(--accent)",
                            transition: "all 0.6s",
                        }}>
                            <Activity style={{ width: 13, height: 13 }} />
                            AI-Powered Equity Research Agent
                            <span style={{ color: "var(--text-3)" }}>·</span>
                            <span style={{ color: "var(--text-2)" }}>Explain. Compare. Justify.</span>
                        </div>
                    </div>

                    {/* Headline */}
                    <h1 style={{
                        fontSize: "clamp(2.4rem, 6vw, 4rem)",
                        fontWeight: 900,
                        lineHeight: 1.05,
                        letterSpacing: "-0.04em",
                        textAlign: "center",
                        marginBottom: 20,
                    }} className="animate-fiu delay-1">
                        <span className="gradient-text">Institutional-grade</span>
                        <br />
                        <span style={{ color: "var(--text-1)" }}>analysis, in seconds.</span>
                    </h1>

                    <p style={{
                        textAlign: "center", color: "var(--text-2)",
                        fontSize: "1.1rem", lineHeight: 1.7,
                        maxWidth: 560, margin: "0 auto 48px",
                    }} className="animate-fiu delay-2">
                        Your AI junior analyst. Built for the markets. No hallucinations —
                        just data, reasoning, and a clear verdict.
                    </p>

                    {/* ── Mode Selector ── */}
                    <div className="animate-fiu delay-2" style={{ marginBottom: 20 }}>
                        <div className="mode-pill">
                            {(["quick", "deep"] as ResearchMode[]).map(m => (
                                <button
                                    key={m}
                                    className={`mode-btn${mode === m ? " active" : ""}`}
                                    onClick={() => handleModeSwitch(m)}
                                >
                                    <span className="mode-icon">{MODES[m].icon}</span>
                                    <div style={{ textAlign: "left" }}>
                                        <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{MODES[m].label}</div>
                                        <div style={{ fontSize: "0.72rem", opacity: 0.65, fontWeight: 500 }}>{MODES[m].badge}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mode context line */}
                    <p style={{
                        textAlign: "center", color: "var(--accent)",
                        fontSize: "0.83rem", marginBottom: 32,
                        fontWeight: 500, letterSpacing: "0.02em",
                        transition: "color 0.6s",
                        minHeight: "1.2em",
                    }}>
                        {cfg.tagline}
                    </p>

                    {/* ── Search form ── */}
                    <form onSubmit={handleSubmit} className="animate-fiu delay-3" style={{ marginBottom: 16 }}>
                        <div style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border)",
                            borderRadius: 14,
                            overflow: "hidden",
                            transition: "border-color 0.3s, box-shadow 0.3s, background 0.6s",
                            boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
                        }}
                            onFocus={() => { }} // handled by input
                        >
                            {/* Ticker row */}
                            <div style={{
                                display: "flex", alignItems: "center",
                                padding: "0 16px",
                                borderBottom: "1px solid var(--border)",
                            }}>
                                <span style={{ color: "var(--text-3)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 12 }}>
                                    Ticker
                                </span>
                                <input
                                    ref={tickerRef}
                                    className="search-input ticker-input"
                                    style={{
                                        flex: "0 0 auto", width: 120,
                                        border: "none", borderRadius: 0,
                                        background: "transparent", padding: "14px 0",
                                        outline: "none", boxShadow: "none",
                                    }}
                                    placeholder="e.g. RELIANCE"
                                    value={ticker}
                                    onChange={e => setTicker(e.target.value.toUpperCase().slice(0, 5))}
                                    maxLength={5}
                                    required
                                />
                                <div style={{ height: 24, width: 1, background: "var(--border)", margin: "0 16px" }} />
                                <span style={{ color: "var(--text-3)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 12 }}>
                                    Research Query
                                </span>
                            </div>

                            {/* Query + submit row */}
                            <div style={{ display: "flex", alignItems: "center", padding: "4px 8px 8px" }}>
                                <textarea
                                    className="search-input"
                                    style={{
                                        flex: 1, border: "none", background: "transparent",
                                        resize: "none", minHeight: 52, padding: "12px 14px",
                                        fontSize: "0.95rem", outline: "none", boxShadow: "none",
                                        lineHeight: 1.5,
                                    }}
                                    placeholder={cfg.desc}
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    rows={2}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); }
                                    }}
                                />
                                <div style={{ padding: "0 8px" }}>
                                    <button type="submit" className="btn-primary" disabled={loading} style={{ minWidth: 110 }}>
                                        {loading ? (
                                            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span className="live-dot" style={{ width: 8, height: 8 }} /> Analyzing...
                                            </span>
                                        ) : (
                                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <Search style={{ width: 15, height: 15 }} /> Analyze
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* ── Quick-fill queries ── */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 40 }}>
                        {cfg.queries.map(q => (
                            <button
                                key={q}
                                onClick={() => fillQuery(q)}
                                className="btn-secondary"
                                style={{ fontSize: "0.78rem" }}
                            >
                                <ChevronRight style={{ width: 11, height: 11 }} /> {q}
                            </button>
                        ))}
                    </div>

                    {/* ── Popular tickers ── */}
                    <div style={{ textAlign: "center", marginBottom: 64 }}>
                        <p style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
                            Popular Tickers
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                            {POPULAR.map(t => (
                                <button
                                    key={t}
                                    onClick={() => fillTicker(t)}
                                    style={{
                                        fontFamily: "var(--font-mono, monospace)",
                                        fontWeight: 700,
                                        fontSize: "0.8rem",
                                        letterSpacing: "0.08em",
                                        padding: "8px 16px",
                                        borderRadius: 8,
                                        border: "1px solid var(--border)",
                                        background: ticker === t ? "var(--accent-dim)" : "transparent",
                                        borderColor: ticker === t ? "var(--accent-border)" : "var(--border)",
                                        color: ticker === t ? "var(--accent)" : "var(--text-2)",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                    }}
                                    onMouseEnter={e => {
                                        if (ticker !== t) {
                                            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)";
                                            (e.currentTarget as HTMLElement).style.color = "var(--text-1)";
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (ticker !== t) {
                                            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                                            (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
                                        }
                                    }}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Features grid ── */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 16,
                        marginBottom: 48,
                    }}>
                        {[
                            {
                                icon: <Zap style={{ width: 18, height: 18 }} />,
                                title: "Quick Mode",
                                desc: "Signal in 30s. KPIs, verdict, top risks — instantly synthesized.",
                            },
                            {
                                icon: <Brain style={{ width: 18, height: 18 }} />,
                                title: "Deep Mode",
                                desc: "Full 9-section research memo. Peers, scenarios, valuation.",
                            },
                            {
                                icon: <TrendingUp style={{ width: 18, height: 18 }} />,
                                title: "Bull vs Bear",
                                desc: "Structured thesis with catalysts, not vague sentiment.",
                            },
                            {
                                icon: <Shield style={{ width: 18, height: 18 }} />,
                                title: "Contradiction Scan",
                                desc: "Flags when mgmt narrative contradicts reported numbers.",
                            },
                            {
                                icon: <BarChart2 style={{ width: 18, height: 18 }} />,
                                title: "Peer Benchmarking",
                                desc: "Relative valuation against sector comps, auto-sourced.",
                            },
                            {
                                icon: <Clock style={{ width: 18, height: 18 }} />,
                                title: "Financial Memory",
                                desc: "Learns your risk profile, horizon, and preferred KPIs.",
                            },
                        ].map(f => (
                            <div
                                key={f.title}
                                className="glass-card"
                                style={{ padding: "20px 22px" }}
                            >
                                <div style={{
                                    width: 36, height: 36, borderRadius: 9,
                                    background: "var(--accent-dim)", border: "1px solid var(--accent-border)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: "var(--accent)", marginBottom: 12,
                                    transition: "all 0.6s",
                                }}>
                                    {f.icon}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 6, color: "var(--text-1)" }}>
                                    {f.title}
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-2)", lineHeight: 1.6 }}>
                                    {f.desc}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Recent history ── */}
                    {history.length > 0 && (
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                                <Clock style={{ width: 14, height: 14, color: "var(--accent)" }} />
                                <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>
                                    Recent Analyses
                                </span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {history.map((h, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setTicker(h.ticker);
                                            setQuery(h.query);
                                            setMode(h.mode as ResearchMode);
                                        }}
                                        className="glass-card"
                                        style={{
                                            display: "flex", alignItems: "center", justifyContent: "space-between",
                                            padding: "14px 18px",
                                            cursor: "pointer", width: "100%", textAlign: "left",
                                            background: "none",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                            <span style={{
                                                fontFamily: "var(--font-mono, monospace)",
                                                fontWeight: 800, fontSize: "0.88rem",
                                                color: "var(--accent)",
                                                minWidth: 52,
                                                transition: "color 0.6s",
                                            }}>{h.ticker}</span>
                                            <span style={{ fontSize: "0.83rem", color: "var(--text-2)" }}>{h.query}</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                                            <span className="tag">{h.mode}</span>
                                            <ChevronRight style={{ width: 14, height: 14, color: "var(--text-3)" }} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </main>

                {/* ── Footer ── */}
                <footer style={{ borderTop: "1px solid var(--border)", marginTop: 48 }}>

                    {/* Main footer grid */}
                    <div style={{
                        maxWidth: 1100, margin: "0 auto",
                        padding: "48px 24px 32px",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: 40,
                    }}>

                        {/* Brand column */}
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                <BarChart2 style={{ width: 18, height: 18, color: "var(--accent)" }} />
                                <span style={{ fontWeight: 800, fontSize: "1rem" }}>
                                    <span className="glow-text">Equity</span>
                                    <span style={{ color: "var(--text-1)" }}>Mind</span>
                                    <span style={{
                                        color: "var(--accent)", marginLeft: 4, fontSize: "0.65rem",
                                        border: "1px solid var(--accent-border)", padding: "1px 5px", borderRadius: 4
                                    }}>AI</span>
                                </span>
                            </div>
                            <p style={{ fontSize: "0.78rem", color: "var(--text-2)", lineHeight: 1.7, maxWidth: 200 }}>
                                AI-powered equity research agent. Explain. Compare. Justify.
                            </p>
                            <p style={{ fontSize: "0.72rem", color: "var(--text-3)", marginTop: 12 }}>
                                ⚠ Not financial advice. For research purposes only.
                            </p>
                        </div>

                        {/* Indian Exchanges & Regulators */}
                        <div>
                            <p style={{
                                fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em",
                                textTransform: "uppercase", color: "var(--text-3)", marginBottom: 14
                            }}>
                                Indian Markets
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                                {[
                                    { label: "NSE India", url: "https://www.nseindia.com", sub: "National Stock Exchange" },
                                    { label: "BSE India", url: "https://www.bseindia.com", sub: "Bombay Stock Exchange" },
                                    { label: "SEBI", url: "https://www.sebi.gov.in", sub: "Market Regulator" },
                                    { label: "RBI", url: "https://www.rbi.org.in", sub: "Reserve Bank of India" },
                                    { label: "MCX India", url: "https://www.mcxindia.com", sub: "Multi Commodity Exchange" },
                                    { label: "NIFTY Indices", url: "https://www.niftyindices.com", sub: "NSE Index Data" },
                                    { label: "AMFI", url: "https://www.amfiindia.com", sub: "Mutual Fund Association" },
                                ].map(l => (
                                    <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                                        style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 1 }}
                                        onMouseEnter={e => (e.currentTarget.querySelector("span") as HTMLElement).style.color = "var(--accent)"}
                                        onMouseLeave={e => (e.currentTarget.querySelector("span") as HTMLElement).style.color = "var(--text-2)"}>
                                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-2)", transition: "color 0.2s" }}>
                                            {l.label} ↗
                                        </span>
                                        <span style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>{l.sub}</span>
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Research & Case Studies */}
                        <div>
                            <p style={{
                                fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em",
                                textTransform: "uppercase", color: "var(--text-3)", marginBottom: 14
                            }}>
                                Research & Case Studies
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                                {[
                                    { label: "Screener.in", url: "https://www.screener.in", sub: "Company Financials" },
                                    { label: "Tickertape", url: "https://www.tickertape.in", sub: "Stock Research Platform" },
                                    { label: "Trendlyne", url: "https://trendlyne.com", sub: "Analytics & Forecasts" },
                                    { label: "Value Research", url: "https://www.valueresearchonline.com", sub: "MF & Stock Analysis" },
                                    { label: "Dalal St. Journal", url: "https://www.dsij.in", sub: "Market Case Studies" },
                                    { label: "ET Markets", url: "https://economictimes.indiatimes.com/markets", sub: "Economic Times" },
                                    { label: "Moneycontrol", url: "https://www.moneycontrol.com", sub: "News & Data" },
                                ].map(l => (
                                    <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                                        style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 1 }}
                                        onMouseEnter={e => (e.currentTarget.querySelector("span") as HTMLElement).style.color = "var(--accent)"}
                                        onMouseLeave={e => (e.currentTarget.querySelector("span") as HTMLElement).style.color = "var(--text-2)"}>
                                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-2)", transition: "color 0.2s" }}>
                                            {l.label} ↗
                                        </span>
                                        <span style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>{l.sub}</span>
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Data Sources */}
                        <div>
                            <p style={{
                                fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em",
                                textTransform: "uppercase", color: "var(--text-3)", marginBottom: 14
                            }}>
                                Global Data Sources
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                                {[
                                    { label: "Finnhub", url: "https://finnhub.io", sub: "Real-time Financial API" },
                                    { label: "Alpha Vantage", url: "https://www.alphavantage.co", sub: "Fundamentals & Time Series" },
                                    { label: "SEC EDGAR", url: "https://www.sec.gov/edgar", sub: "US Company Filings" },
                                    { label: "MCA India", url: "https://www.mca.gov.in", sub: "Company Affairs India" },
                                    { label: "BSE Filings", url: "https://www.bseindia.com/corporates/ann.html", sub: "Corporate Announcements" },
                                    { label: "SEBI EDGAR", url: "https://efts.sebi.gov.in", sub: "SEBI Filing System" },
                                ].map(l => (
                                    <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                                        style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 1 }}
                                        onMouseEnter={e => (e.currentTarget.querySelector("span") as HTMLElement).style.color = "var(--accent)"}
                                        onMouseLeave={e => (e.currentTarget.querySelector("span") as HTMLElement).style.color = "var(--text-2)"}>
                                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-2)", transition: "color 0.2s" }}>
                                            {l.label} ↗
                                        </span>
                                        <span style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>{l.sub}</span>
                                    </a>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Bottom strip */}
                    <div style={{
                        borderTop: "1px solid var(--border)",
                        padding: "18px 24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 12,
                        background: "rgba(0,0,0,0.3)",
                    }}>
                        <p style={{ fontSize: "0.72rem", color: "var(--text-3)", margin: 0 }}>
                            © {new Date().getFullYear()} EquityMind AI · Not financial advice · Data sourced from public APIs
                        </p>
                        <p style={{ fontSize: "0.72rem", color: "var(--text-3)", margin: 0 }}>
                            Designed & Developed by{" "}
                            <a
                                href="https://vaibhavrajportfolio.vercel.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    color: "var(--accent)",
                                    textDecoration: "none",
                                    fontWeight: 700,
                                    transition: "opacity 0.2s",
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.75"}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                            >
                                Tea for Chat ↗
                            </a>
                        </p>
                    </div>

                </footer>
            </div>
        </>
    );
}
