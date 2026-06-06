**Agent Workflow — LLM + Firecrawl (Agent Flow)**

This document now describes the concise agent flow used by the Forecaster: a focused pipeline where the agent retrieves market data, discovers a small set of relevant articles, and asks the LLM to produce a structured forecast.

Flow (single-pass)

- Market Data
  - Source: `GET /api/market?ticker={ticker}` or internal market API. The agent MUST start from a canonical market object.

- Generate Search Queries
  - Build 1–3 search queries derived from the market title, subtitle, and key terms (e.g., names, organizations, dates).

- Firecrawl Search
  - Use the generated queries to run Firecrawl searches and return 3–5 articles maximum (dedupe by URL).
  - The Firecrawl search is performed locally (server-side) and the results (articles) are sent back to the LLM for context. The LLM waits for these results before producing the forecast.

- Initial Forecast (LLM)
  - Input: `market` object + `articles` (text, url, published_at, source) + optional `user_profile`.
  - Output: a JSON object with: `forecast` (probability), `rationale` (string), `articles_used` (list of article ids/urls), and `confidence` (0..1).

- Confidence Check
  - If `confidence < 0.75` the LLM SHOULD include in its JSON response a `recommendation` field suggesting purchase(s) of private data (e.g., deeper news, datasets) and a brief justification.

Example LLM response schema (required)

```
{
  "forecast": 0.55,
  "rationale": "Short human-readable rationale...",
  "articles_used": ["https://..."],
  "confidence": 0.82,
  "recommendation": {
    "purchase_suggestion": "buy_news_pack",
    "reason": "insufficient coverage on regulatory filings"
  }
}
```

Notes and constraints

- Timeouts: Firecrawl searches should complete within a configured timeout (e.g., 10s). If searches time out, proceed with available context and mark `confidence` lower.
- Article limits: cap at 3–5 articles to bound prompt size and cost.
- Determinism & audit: record `prompt_hash`, `model_id`, and `articles_used` in the report log for later auditing and reputation updates.

Minimal endpoints to implement

- `GET /api/market?ticker=` — return canonical market object.
- `POST /api/news/search` — accept queries, return up to 5 deduped article objects.
- `POST /api/recommendations` — orchestrates: fetch market, generate queries, call Firecrawl, call LLM, run confidence check, return LLM JSON response.

Next steps

1. Implement the `POST /api/recommendations` orchestration stub that follows this flow and returns the exact LLM response schema.
2. Add logging for `prompt_hash` and `articles_used` to enable audit and future ERC-8004 attestations.
3. Implement a small retry/backoff around Firecrawl calls and a configurable article cap.
