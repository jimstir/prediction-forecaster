# Prediction Forecaster

Lightweight Next.js + LLM orchestration that fetches a canonical market object (Kalshi), generates search queries, retrieves news (Firecrawl), and asks an LLM to produce an evidence-backed forecast. The agent can autonomously purchase premium research via an x402-backed Agent Wallet and re-run analysis to produce a final forecast.

**Status**: prototype — LLM, Firecrawl, and x402 integration include pluggable stubs and fallbacks so you can run locally without keys.

**Contents**

- lib/agent.js — orchestration pipeline (queries → Firecrawl → initial LLM → optional x402 purchase → final LLM)
- lib/llm.js — pluggable LLM client (uses GEMINI_API_URL/GEMINI_API_KEY when set; local heuristics fallback)
- lib/x402.js — x402 purchase stub (simulates purchase or signs a dummy tx using Agent Wallet)
- app/api/recommendations/route.js — POST endpoint to run orchestration on a supplied `market` object
- app/api/premium/route.js — premium research stub endpoint (returns mock premium articles)
- app/api/kalshi/market/route.js — proxy to Kalshi and curator mapping
- app/api/kalshi/curator.js — transforms Kalshi payload into canonical market object
- app/components/ForecastWidget.js — UI component wired to call `/api/kalshi/market` then `/api/recommendations`
- tests/run_recommendation_flow.mjs — demo runner for local testing without running Next

Quick start

1. Install deps

```bash
npm install
```

2. (Optional) Configure environment variables — create a `.env` file in the project root. Example variables:

```
# LLM / Gemini
GEMINI_API_URL=
GEMINI_API_KEY=

# Firecrawl
FIRECRAWL_API_URL=
FIRECRAWL_API_KEY=

# Agent wallet for x402 (server-side; keep secret)
AGENT_WALLET_PRIVATE_KEY=
ETH_RPC_URL=

# Premium research override
PREMIUM_RESEARCH_URL=http://localhost:3000/api/premium

# Kalshi
KALSHI_API_KEY=

# Optional: set to enable Privy-based auth in the frontend
NEXT_PUBLIC_PRIVY_APP_ID=

```

3a. Run the Next.js dev server (to use the UI)

```bash
npm run dev
# Open http://localhost:3000
```

3b. Run the headless demo (no Next server required)

```bash
node tests/run_recommendation_flow.mjs
```

API endpoints (local stubs + orchestrator)

- `GET /api/kalshi/market?ticker={ticker}` — returns curated market object from Kalshi payload (see `app/api/kalshi/curator.js`).
- `POST /api/recommendations` — main orchestration: accepts `{ market, userProfile? }` and returns `{ initial, premium|null, final }`.
- `POST /api/premium` — premium research stub returning `articles` and `summaries` used after an x402 purchase.

LLM response schema (final)

The orchestrator expects the LLM to return a final JSON object with these recommended fields (current implementation uses percentages 0–100):

```
{
  "probability": 71,
  "confidence": 84,
  "reasoning": ["...", "..."],
  "articles_used": ["https://..."],
  "recommendation": { "purchase_suggestion": "none", "reason": "..." },
  "prompt_hash": "sha256:...",
  "model_id": "gemini-vX"
}
```

Behavior notes and integration points

- `lib/llm.js` calls `GEMINI_API_URL`/`GEMINI_API_KEY` when present. The request/response shape is intentionally generic — adapt `callRemoteLLM` to match your Gemini/LLM provider's API and prompts.
- `lib/agent.js` will call `generateSearchTerms()` (LLM) then `callFirecrawl()` to get 3–5 articles (calls `FIRECRAWL_API_URL` when configured). If `initial.purchaseAdditionalResearch` is true, the code calls `purchaseResearch()` in `lib/x402.js` and then fetches premium research from `PREMIUM_RESEARCH_URL`.
- `lib/x402.js` is a stub that simulates purchases when `AGENT_WALLET_PRIVATE_KEY` or `ETH_RPC_URL` are missing. Replace the internals with real x402 API calls and exact payment flow.
- `app/components/ForecastWidget.js` demonstrates fetching a Kalshi market and then POSTing it to `/api/recommendations`; it displays raw JSON results (feel free to style the final card).

Security

- Never commit real private keys. Use environment variables and secrets management for production.
- The Agent Wallet is server-side and must be protected. Do not expose `AGENT_WALLET_PRIVATE_KEY` to the browser.

Next steps (recommended)

1. Wire `lib/llm.js` to the real Gemini/LLM API and implement the required prompt templates.
2. Replace `lib/x402.js` stub with the real x402 payment API and handle webhooks/receipts.
3. Harden Firecrawl parsing and implement deduplication/prompt size limits.
4. Add logging of `prompt_hash`, `model_id`, and `articles_used` for audit and optional on-chain attestations.

Contributing

Open issues or PRs for bug fixes and feature requests. For questions about environment variables or integrating external APIs, include sample request/response payloads and API docs.

License

MIT

**Privy integration (wallet + auth)**

- Frontend: this project includes dynamic Privy imports and a popup-based connect flow. To enable Privy UI features set `NEXT_PUBLIC_PRIVY_APP_ID` in your `.env` and configure your Privy app redirect/origins to `http://localhost:3000` (or your deployed origin).
- Server-side: Privy server validation (if used) requires `PRIVY_CLIENT_ID` and `PRIVY_CLIENT_SECRET` in env. Implement server-side session verification at `POST /api/auth/privy` to validate popup callbacks and map Privy user -> wallet addresses.
- UX: the Forecast Agent uses a backend-owned Agent Wallet for payments (x402). Users authenticate via Privy but do not sign the purchase transactions; the service pays for premium research on behalf of the user.

**Deploying ERC-8004 / x402 on Base (recommended flow)**

This project scaffolds a sample contract and Hardhat config. To deploy ERC-8004-style attestations and integrate x402 on Base, follow these steps:

1. Configure env for Base:

```
ETH_RPC_URL=https://base-mainnet.rpc.url
AGENT_WALLET_PRIVATE_KEY=your_agent_wallet_private_key
```

2. Install dependencies and compile contracts:

```bash
npm install
npm run compile
```

3. Deploy with Hardhat (example):

```bash
npx hardhat run --network base scripts/deploy.js
```

4. After deployment, set `ERC8004_CONTRACT_ADDRESS` in your `.env` and use `POST /api/attestations` (to be implemented) to write attestations referencing `prompt_hash` and `model_id`.

Notes & cautions

- Gas & chain: Base is an EVM-compatible L2 — ensure your RPC and gas settings are appropriate. Use a funded deployer wallet.
- x402 integration: x402 payment flows vary; if x402 supplies on-chain hooks, your backend can call their API and then publish a light on-chain receipt or attestation pointing to the purchase metadata.
- Security: treat `AGENT_WALLET_PRIVATE_KEY` as highly sensitive. Use a secrets manager for production deployments and restrict access.

If you want, I can add example Hardhat network config for Base and a deploy script that writes an ERC-8004-style attestation contract address into `.env.example`.
