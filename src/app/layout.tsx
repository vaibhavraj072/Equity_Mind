import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import TickerTape from "@/components/TickerTape";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
    display: "swap",
});

export const metadata: Metadata = {
    title: "EquityMind AI — Financial Research Agent",
    description:
        "AI-powered equity research agent that thinks like a junior analyst. Synthesize financial data, build investment theses, and generate structured memos. Explain. Compare. Justify.",
    keywords: ["equity research", "financial analysis", "investment memo", "AI analyst"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
            <body
                className="min-h-screen antialiased"
                style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            >
                {/* ── NSE Live Ticker Tape ── */}
                <TickerTape />

                {/*
                    Push all page content down by the ticker height (34px)
                    so nothing is hidden behind the fixed bar.
                */}
                <div style={{ paddingTop: "34px" }}>
                    {children}
                </div>
            </body>
        </html>
    );
}
