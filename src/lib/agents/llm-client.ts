import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

/* -------------------------------------------------------------------------- */
/*                              TYPE DEFINITIONS                               */
/* -------------------------------------------------------------------------- */

export interface Message {
    role: "system" | "user" | "assistant";
    content: string;
}

/* -------------------------------------------------------------------------- */
/*                            GEMINI CLIENT SETUP                              */
/* -------------------------------------------------------------------------- */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

/* -------------------------------------------------------------------------- */
/*                             SAFETY SETTINGS                                 */
/* -------------------------------------------------------------------------- */

const SAFETY_SETTINGS = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

/* -------------------------------------------------------------------------- */
/*                              MODEL FALLBACK LISTS                           */
/* -------------------------------------------------------------------------- */

/** Quick mode: prefer the fastest model; fall back to stable flash. */
const QUICK_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
];

/** Deep mode: prefer best reasoning model; fall back gracefully. */
const DEEP_MODELS = [
    "gemini-2.5-pro-exp-03-25",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
];

/* -------------------------------------------------------------------------- */
/*                              ERROR CLASSIFIERS                              */
/* -------------------------------------------------------------------------- */

function isModelUnavailable(err: any): boolean {
    const msg: string = err?.message ?? String(err);
    return (
        msg.includes("404") ||
        msg.includes("not found") ||
        msg.includes("model not found") ||
        msg.includes("unavailable") ||
        msg.includes("FAILED_PRECONDITION")
    );
}

function isRateLimit(err: any): boolean {
    const msg: string = err?.message ?? String(err);
    return (
        msg.includes("429") ||
        msg.includes("quota") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("rate limit")
    );
}

/* -------------------------------------------------------------------------- */
/*                           MAIN LLM CLIENT EXPORT                           */
/* -------------------------------------------------------------------------- */

export async function callWithFallback(
    mode: "quick" | "deep",
    params: { messages: Message[]; temperature?: number; max_tokens?: number }
): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY in environment variables.");
    }

    const modelList = mode === "quick" ? QUICK_MODELS : DEEP_MODELS;

    const systemPart =
        params.messages.find((m) => m.role === "system")?.content ?? "";
    const userPart =
        params.messages.find((m) => m.role === "user")?.content ?? "";

    const prompt = systemPart
        ? `${systemPart}\n\n---\n\n${userPart}`
        : userPart;

    for (const modelName of modelList) {
        try {
            console.log(`[gemini] Trying ${modelName}`);

            const model = genAI.getGenerativeModel({
                model: modelName,
                safetySettings: SAFETY_SETTINGS,
                generationConfig: {
                    temperature: params.temperature ?? 0.2,
                    maxOutputTokens: params.max_tokens ?? 1500,
                },
            });

            const result = await model.generateContent(prompt);

            const text = result?.response?.text?.();

            if (!text || text.trim().length === 0) {
                console.warn(
                    `[gemini] ${modelName} returned empty response — trying next model`
                );
                continue;
            }

            console.log(`[gemini] ✓ Success on ${modelName}`);
            return text;

        } catch (err: any) {
            if (isModelUnavailable(err)) {
                console.warn(
                    `[gemini] ${modelName} unavailable — skipping`
                );
                continue;
            }

            if (isRateLimit(err)) {
                console.warn(
                    `[gemini] ${modelName} rate-limited — trying next model`
                );
                continue;
            }

            console.error(
                `[gemini] Fatal error on ${modelName}:`,
                err?.message || err
            );
            throw err;
        }
    }

    throw new Error(
        "All Gemini models unavailable or rate-limited."
    );
}