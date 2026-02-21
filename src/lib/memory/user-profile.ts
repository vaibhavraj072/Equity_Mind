import fs from "fs";
import path from "path";
import { UserMemoryProfile } from "@/types";
import { config } from "@/lib/config";

const DATA_DIR = path.join(process.cwd(), "data");
const PROFILE_FILE = path.join(DATA_DIR, "user-profile.json");

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

export function getUserProfile(): UserMemoryProfile {
    ensureDataDir();
    try {
        if (fs.existsSync(PROFILE_FILE)) {
            const raw = fs.readFileSync(PROFILE_FILE, "utf-8");
            return JSON.parse(raw) as UserMemoryProfile;
        }
    } catch {
        // Return default if file is corrupt
    }
    return {
        ...config.defaultUserProfile,
        lastUpdated: new Date().toISOString(),
    };
}

export function updateUserProfile(patch: Partial<UserMemoryProfile>): UserMemoryProfile {
    ensureDataDir();
    const current = getUserProfile();
    const updated: UserMemoryProfile = {
        ...current,
        ...patch,
        lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
}

export function inferPreferencesFromQuery(
    query: string,
    profile: UserMemoryProfile
): Partial<UserMemoryProfile> {
    const updates: Partial<UserMemoryProfile> = {};

    // Infer risk tolerance from language
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes("aggressive") || lowerQuery.includes("high growth") || lowerQuery.includes("speculative")) {
        updates.riskTolerance = "aggressive";
    } else if (lowerQuery.includes("conservative") || lowerQuery.includes("dividend") || lowerQuery.includes("safe")) {
        updates.riskTolerance = "conservative";
    }

    // Infer horizon
    if (lowerQuery.includes("short-term") || lowerQuery.includes("next quarter") || lowerQuery.includes("1 year")) {
        updates.investmentHorizon = "short";
    } else if (lowerQuery.includes("long-term") || lowerQuery.includes("5 year") || lowerQuery.includes("decade")) {
        updates.investmentHorizon = "long";
    }

    // Infer KPI preferences
    const kpiKeywords: Record<string, string[]> = {
        EBITDA: ["ebitda"],
        "Free Cash Flow": ["free cash flow", "fcf"],
        ROE: ["roe", "return on equity"],
        EPS: ["eps", "earnings per share"],
        Revenue: ["revenue growth", "top-line"],
        Margins: ["margin", "profitability"],
    };

    const newKPIs = [...profile.preferredKPIs];
    for (const [kpi, keywords] of Object.entries(kpiKeywords)) {
        if (keywords.some((k) => lowerQuery.includes(k)) && !newKPIs.includes(kpi)) {
            newKPIs.push(kpi);
        }
    }
    if (newKPIs.length !== profile.preferredKPIs.length) {
        updates.preferredKPIs = newKPIs.slice(0, 6);
    }

    return updates;
}
