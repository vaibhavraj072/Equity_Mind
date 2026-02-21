import fs from "fs";
import path from "path";
import { AnalysisHistoryItem, InvestmentMemo } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const MAX_HISTORY = 50;

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

export function getHistory(limit = 20): AnalysisHistoryItem[] {
    ensureDataDir();
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
            const all: AnalysisHistoryItem[] = JSON.parse(raw);
            return all.slice(0, limit);
        }
    } catch {
        // ignore
    }
    return [];
}

export function saveAnalysis(memo: InvestmentMemo): void {
    ensureDataDir();
    const history = getHistory(MAX_HISTORY);
    const item: AnalysisHistoryItem = {
        id: memo.id,
        ticker: memo.ticker,
        companyName: memo.companyName,
        mode: memo.mode,
        analysisDate: memo.analysisDate,
        overallSentiment: memo.overallSentiment,
        confidenceScore: memo.confidenceScore.overall,
    };
    const updated = [item, ...history].slice(0, MAX_HISTORY);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(updated, null, 2), "utf-8");
}

export function getNextRecommendations(
    history: AnalysisHistoryItem[],
    currentTicker?: string
): string[] {
    const SECTOR_PEERS: Record<string, string[]> = {
        AAPL: ["MSFT", "GOOGL", "META", "AMZN"],
        MSFT: ["AAPL", "GOOGL", "CRM", "ORCL"],
        GOOGL: ["META", "AMZN", "MSFT", "SNAP"],
        NVDA: ["AMD", "INTC", "AVGO", "QCOM"],
        TSLA: ["RIVN", "GM", "F", "NIO"],
        JNJ: ["PFE", "ABBV", "MRK", "BMY"],
        META: ["GOOGL", "SNAP", "PINS", "TWTR"],
        AMZN: ["MSFT", "GOOGL", "WMT", "SHOP"],
    };

    const studied = new Set(history.map((h) => h.ticker));
    if (currentTicker) studied.delete(currentTicker);

    const suggestions: string[] = [];

    if (currentTicker && SECTOR_PEERS[currentTicker]) {
        for (const peer of SECTOR_PEERS[currentTicker]) {
            if (!studied.has(peer)) suggestions.push(peer);
        }
    }

    // Fill with popular tickers not yet studied
    const popular = ["AAPL", "MSFT", "GOOGL", "NVDA", "AMZN", "META", "TSLA", "JNJ"];
    for (const t of popular) {
        if (!studied.has(t) && !suggestions.includes(t)) {
            suggestions.push(t);
        }
    }

    return suggestions.slice(0, 5);
}
