import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                navy: {
                    950: "#040d1f",
                    900: "#060e24",
                    800: "#0a1628",
                    700: "#0f2044",
                    600: "#162b5e",
                    500: "#1e3a7a",
                },
                gold: {
                    400: "#f5c842",
                    500: "#e8b400",
                    600: "#c99a00",
                },
                emerald: {
                    400: "#34d399",
                    500: "#10b981",
                },
                crimson: {
                    400: "#f87171",
                    500: "#ef4444",
                },
                surface: {
                    50: "#f8fafc",
                    100: "#1a2540",
                    200: "#141e35",
                    300: "#0e172c",
                },
                muted: "#6b7a9e",
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "hero-pattern":
                    "radial-gradient(ellipse at 20% 50%, rgba(30, 58, 122, 0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(232, 180, 0, 0.1) 0%, transparent 50%)",
                "card-gradient":
                    "linear-gradient(135deg, rgba(26, 37, 64, 0.9) 0%, rgba(14, 23, 44, 0.95) 100%)",
            },
            boxShadow: {
                glow: "0 0 20px rgba(232, 180, 0, 0.15)",
                "glow-lg": "0 0 40px rgba(232, 180, 0, 0.2)",
                card: "0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                "card-hover":
                    "0 8px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
            },
            animation: {
                "fade-in": "fadeIn 0.5s ease-in-out",
                "slide-up": "slideUp 0.4s ease-out",
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                shimmer: "shimmer 2s linear infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(16px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
            },
        },
    },
    plugins: [],
};

export default config;
