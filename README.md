# EquityMind AI  
### Explain. Compare. Justify.

---

## 🎥 Project Demo

> Watch the full demo of EquityMind AI below:

<video src="src/resources/Final Equity_Mids.mp4" controls width="100%"></video>

If the video does not render on GitHub, you can download it directly from:
`src/resources/Final Equity_Mids.mp4`

---

## 🚀 Overview

EquityMind AI is a Deep Financial & Market Research Agent designed to behave like a junior equity analyst or strategy consultant — not a chatbot.

It synthesizes financial statements, earnings calls, market data, and company comparisons to generate structured, transparent, and decision-ready investment insights.

This system is built to:
- Analyze
- Compare
- Justify
- Personalize

All within a structured analytical workflow.

---

## 📌 Problem Statement

Finance and strategy teams spend significant time manually analyzing:

- Financial statements  
- Earnings call transcripts  
- Market data  
- Peer companies  
- Risk disclosures  

Challenges include:

- Scattered information across sources  
- Time-consuming synthesis  
- Lack of structured justification  
- Limited personalization  
- Poor traceability of conclusions  

There is a need for an AI system that does not merely summarize —  
but thinks like a financial analyst.

---

## 🎯 Core Capabilities

### 🔹 Dual Research Modes

**Quick Mode (<30 seconds)**
- Earnings summary  
- Revenue growth (YoY)  
- KPI snapshot  
- Risk highlights  

**Deep Mode (<3 minutes)**
- Fundamental analysis  
- Peer benchmarking  
- Bull vs Bear thesis generation  
- Scenario simulation  
- Sensitivity testing  

---

### 🔹 Financial Memory

The agent remembers:

- Risk tolerance (Conservative / Moderate / Aggressive)  
- Preferred KPIs (EBITDA, ROE, FCF, EPS, etc.)  
- Sector interests  
- Geographic focus  
- Investment horizon  

This enables personalized, context-aware analysis.

---

### 🔹 Interactive Analytical Flow

User Query  
→ Clarifying Questions  
→ Multi-source Data Retrieval  
→ Multi-step AI Reasoning  
→ Structured Investment Memo  
→ Confidence-Weighted Output  

---

## 🧠 Intelligence Engine

EquityMind AI includes:

- Fundamental Analysis Engine  
- Peer Benchmarking Module  
- Bull vs Bear Generator  
- Scenario & Sensitivity Simulator  
- Confidence Scoring System  
- Multi-source Data Validation  

Each insight includes:
- Explicit assumptions  
- Supporting evidence  
- Structured reasoning  
- Confidence score  

---

## 📊 Example Queries

- Compare Company A vs Company B on fundamentals  
- Generate a bull and bear case with evidence  
- Stress test under high inflation  
- Re-evaluate assuming lower growth  
- Based on my preferences, what should I analyze next?  
- Highlight overlooked risks  

---

## 🏗 System Architecture

### 1️⃣ Frontend Layer (`src/app`, `src/components`)
- Analysis interface  
- Structured memo display  
- KPI dashboards  
- Peer comparison tables  
- Scenario visualization  
- Confidence gauge  
- Clarification dialogs  

---

### 2️⃣ API Layer (`src/app/api`)
- `/analyze` → Main analysis orchestration  
- `/clarify` → Interactive clarification logic  
- `/history` → Session tracking  
- `/memory` → User preference management  
- `/ticker-data` → Market data retrieval  

---

### 3️⃣ Agent Intelligence Layer (`src/lib/agents`)
- `quick-mode.ts` → Rapid extraction logic  
- `deep-mode.ts` → Multi-step analytical reasoning  
- `prompts.ts` → Structured analyst behavior design  
- `llm-client.ts` → Model abstraction layer  
- `confidence-scorer.ts` → Output reliability evaluation  

---

### 4️⃣ Financial Data Layer (`src/lib/financial-data`)
- Alpha Vantage integration  
- Finnhub integration  
- Yahoo Finance integration  
- Unified data aggregation  

---

### 5️⃣ Memory Layer (`src/lib/memory`)
- User profile persistence  
- Historical analysis storage  

---

## 📈 Structured Output Format

Investment Memo Format:

1. Business Overview  
2. Financial Performance  
3. Peer Comparison  
4. Bull Thesis  
5. Bear Thesis  
6. Key Risks  
7. Scenario Analysis  
8. Valuation Summary  
9. Confidence Score  

---

## ⚙️ Design Philosophy

EquityMind AI is built around three principles:

Explain — Every assumption must be clear.  
Compare — Every company must be benchmarked contextually.  
Justify — Every conclusion must be evidence-backed.  

This is not a chatbot.  
It is a structured financial reasoning system.

---

## 🌍 Intended Impact

- Reduce financial research time  
- Improve analytical depth  
- Increase transparency  
- Standardize investment memo generation  
- Enhance strategic decision-making  

---

## 🏁 Closing

EquityMind AI represents the future of AI-driven financial research —  
where structured reasoning replaces generic responses.

Explain. Compare. Justify.
