"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { TickerItem } from "@/app/api/ticker-data/route";

/* -------------------------------------------------------------------------- */
/*                              SINGLE TICKER CHIP                            */
/* -------------------------------------------------------------------------- */

function TickerChip({ item }: { item: TickerItem }) {
    const [flash, setFlash] = useState(false);
    const prevRef = useRef(item.rawPrice);

    useEffect(() => {
        if (prevRef.current !== item.rawPrice) {
            setFlash(true);
            prevRef.current = item.rawPrice;
            const t = setTimeout(() => setFlash(false), 600);
            return () => clearTimeout(t);
        }
    }, [item.rawPrice]);

    const typeLabel = item.type === "index"
        ? "IDX"
        : item.type === "fx"
            ? "FX"
            : "NSE";

    return (
        <span
            className="ticker-chip"
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "0 18px",
                borderRight: "1px solid rgba(0,212,255,0.08)",
                whiteSpace: "nowrap",
                transition: "background 0.3s",
                background: flash
                    ? (item.up ? "rgba(0,255,136,0.07)" : "rgba(255,64,96,0.07)")
                    : "transparent",
            }}
        >
            {/* Type badge */}
            <span style={{
                fontSize: "0.6rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: item.type === "index" ? "var(--accent)" : item.type === "fx" ? "#f59e0b" : "var(--text-3)",
                opacity: 0.7,
            }}>
                {typeLabel}
            </span>

            {/* Name */}
            <span style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "var(--text-2)",
                fontFamily: "var(--font-inter, system-ui)",
            }}>
                {item.name}
            </span>

            {/* Price */}
            <span style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--text-1)",
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontVariantNumeric: "tabular-nums",
            }}>
                {item.price}
            </span>

            {/* Change % */}
            <span style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: item.up ? "var(--bull)" : "var(--bear)",
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
            }}>
                {item.up ? "▲" : "▼"}
                {item.changePercent.replace(/^[+-]/, "")}
            </span>
        </span>
    );
}

/* -------------------------------------------------------------------------- */
/*                           MARKET STATUS BADGE                               */
/* -------------------------------------------------------------------------- */

function MarketBadge({ source }: { source: "live" | "fallback" }) {
    const isLive = source === "live";
    return (
        <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "2px 8px",
            borderRadius: "4px",
            fontSize: "0.6rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: isLive ? "var(--bull)" : "var(--text-3)",
            border: `1px solid ${isLive ? "rgba(0,255,136,0.25)" : "rgba(255,255,255,0.06)"}`,
            background: isLive ? "rgba(0,255,136,0.07)" : "rgba(255,255,255,0.03)",
            flexShrink: 0,
        }}>
            <span style={{
                width: 5, height: 5,
                borderRadius: "50%",
                background: isLive ? "var(--bull)" : "var(--text-3)",
                boxShadow: isLive ? "0 0 6px var(--bull)" : "none",
                animation: isLive ? "livePulse 1.8s ease-in-out infinite" : "none",
            }} />
            {isLive ? "LIVE" : "CLOSED"}
        </span>
    );
}

/* -------------------------------------------------------------------------- */
/*                           MARQUEE TICKER TAPE                              */
/* -------------------------------------------------------------------------- */

function TickerMarquee({ items }: { items: TickerItem[] }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const posRef = useRef(0);
    const rafRef = useRef<number>(0);
    const pausedRef = useRef(false);
    const trackWidthRef = useRef(0);

    // Speed: ~80px/s
    const SPEED = 0.7; // px per frame at 60fps ≈ 42px/s

    useEffect(() => {
        const track = trackRef.current;
        if (!track || items.length === 0) return;

        // Measure one copy width
        trackWidthRef.current = track.scrollWidth / 2; // we duplicate items

        let lastTs = performance.now();
        const animate = (ts: number) => {
            const delta = ts - lastTs;
            lastTs = ts;

            if (!pausedRef.current) {
                posRef.current -= SPEED * (delta / 16.67);
                if (Math.abs(posRef.current) >= trackWidthRef.current) {
                    posRef.current = 0;
                }
                track.style.transform = `translateX(${posRef.current}px)`;
            }

            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
    }, [items]);

    const pause = useCallback(() => { pausedRef.current = true; }, []);
    const resume = useCallback(() => { pausedRef.current = false; }, []);

    // Duplicate items to create seamless loop
    const doubled = [...items, ...items];

    return (
        <div
            ref={containerRef}
            onMouseEnter={pause}
            onMouseLeave={resume}
            style={{
                overflow: "hidden",
                flex: 1,
                cursor: "default",
                maskImage: "linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)",
            }}
        >
            <div
                ref={trackRef}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    willChange: "transform",
                }}
            >
                {doubled.map((item, i) => (
                    <TickerChip key={`${item.symbol}-${i}`} item={item} />
                ))}
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*                         MAIN TICKER TAPE BAR                               */
/* -------------------------------------------------------------------------- */

export default function TickerTape() {
    const [tickers, setTickers] = useState<TickerItem[]>([]);
    const [source, setSource] = useState<"live" | "fallback">("fallback");
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/ticker-data", { cache: "no-store" });
            const data = await res.json();
            setTickers(data.tickers ?? []);
            setSource(data.source ?? "fallback");
        } catch {
            // keep stale data
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Refresh every 15 seconds during market hours
        const interval = setInterval(fetchData, 15_000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
        <div
            id="nse-ticker-tape"
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                height: "34px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                paddingLeft: "12px",
                paddingRight: "12px",
                background: "rgba(2, 12, 24, 0.92)",
                backdropFilter: "blur(12px)",
                borderBottom: "1px solid rgba(0, 212, 255, 0.12)",
                boxShadow: "0 1px 20px rgba(0, 0, 0, 0.5)",
                fontFamily: "var(--font-inter, system-ui, sans-serif)",
            }}
        >

            {/* Scrolling ticker */}
            {loading ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "12px" }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="loading-shimmer" style={{ height: 12, width: 80 + (i % 3) * 20, borderRadius: 4 }} />
                    ))}
                </div>
            ) : (
                <TickerMarquee items={tickers} />
            )}

        </div>
    );
}
