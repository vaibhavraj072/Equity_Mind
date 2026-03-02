import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, compact = false): string {
    if (compact) {
        // Indian scale: Lakh Crore > Crore > Lakh > smaller
        if (Math.abs(value) >= 1e12) return `₹${(value / 1e12).toFixed(1)} L.Cr`;
        if (Math.abs(value) >= 1e7) return `₹${(value / 1e7).toFixed(1)} Cr`;
        if (Math.abs(value) >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
        return `₹${value.toFixed(0)}`;
    }
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
    return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function formatMultiple(value: number, suffix = "x"): string {
    return `${value.toFixed(1)}${suffix}`;
}

export function getSentimentColor(sentiment: string): string {
    switch (sentiment) {
        case "bullish":
            return "text-emerald-400";
        case "bearish":
            return "text-crimson-400";
        default:
            return "text-gold-400";
    }
}

export function getConfidenceColor(score: number): string {
    if (score >= 75) return "text-emerald-400";
    if (score >= 50) return "text-gold-400";
    return "text-crimson-400";
}

export function getRiskColor(severity: string): string {
    switch (severity) {
        case "high":
            return "bg-crimson-500/20 text-crimson-400 border-crimson-500/30";
        case "medium":
            return "bg-gold-500/20 text-gold-400 border-gold-500/30";
        default:
            return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    }
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
