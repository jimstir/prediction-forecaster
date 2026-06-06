**Agent Workflow (Five Stages)**

Overview
- This document describes the user-facing workflow for the Forecasting Agent and maps each stage to backend endpoints, LLM/news providers, and on-chain reputation actions. It assumes the environment variables in `.env.example` are configured.

Stage 1 — Request research & evaluation
- Actor: Alice (end user)
- Action: Alice selects a market and asks the Forecasting Agent to evaluate it.
- Backend flow:
  - Frontend: POST `/api/recommendations` with `{ walletAddress, marketId, preferences }`.
  - Server: fetch contextual news via Firecrawl (`FIRECRAWL_API_KEY`) and recent market data.
  - Server: call Gemini (`GEMINI_API_KEY`) to synthesize evidence, summarize sources, and produce a ranked recommendation + rationale.
  - Response: `{ recommendations: [...], rationale: "...", sources: [...] }` returned to client.

Stage 2 — Publish forecast + reputation anchor (on-chain)
- Goal: publish a verifiable record of the forecast so reputation can be audited without leaking private reasoning.
- Flow:
  - Server computes a compact hash of the forecast payload (rationale, timestamp, marketId, author agent id).
  - Publish a minimal on-chain attestation (ERC-8004-style) on Base with the hash, or store an encrypted payload off-chain and write proof on-chain (recommended).
  - Endpoint: POST `/api/attestations` — server submits attestation using `WALLET_PRIVATE_KEY` and `ETH_RPC_URL`.

Stage 3 — Subscription & paid access
- Actor: Alice purchases subscription (x402 integration) for longer-form forecasts or more frequent access.
- Flow:
  - Frontend calls POST `/api/purchase` with `{ walletAddress, planId }`.
  - Server calls x402 (`X402_API_KEY`) to create the purchase session and handle payment/webhook.
  - After purchase, server marks account as subscriber and allows access to gated forecast content.

Stage 4 — Consume forecast, record interactions
- Action: Alice uses the forecast to make decisions. Platform records UI interactions and whether the user acted on the forecast (optional tracking).
- Flow:
  - Endpoint: POST `/api/interactions` with `{ walletAddress, forecastId, action: 'view|apply|ignore', metadata }`.
  - Logged for analytics and to weight subscriber feedback when updating reputation.

Stage 5 — Resolve & update reputation
- When market resolves, the system compares forecast outcome to actual result and updates the agent's reputation score (on-chain + off-chain aggregation).
- Flow:
  - Worker or cron fetches resolved markets, computes performance metrics for each forecast.
  - Server updates off-chain reputation store (Prisma DB) and optionally writes aggregated reputation attestations on-chain via `/api/attestations`.

Required Endpoints (scaffold suggestions)
- `GET /api/news?query=...` — proxy to Firecrawl and cache results.
- `POST /api/recommendations` — main entry: accepts marketId and returns agent forecast + evidence.
- `POST /api/insights` — topic-specific LLM queries for market deep-dive.
- `POST /api/auth/privy` — popup page or server-side auth handler that finishes Privy auth and posts `{ type: 'privy:connected', address }` to `window.opener`.
- `POST /api/purchase` — create x402 purchase session.
- `POST /api/attestations` — write forecast proof or reputation anchor on-chain.
- `POST /api/interactions` — record user interactions.

Env vars used by the workflow (from `.env.example`)
- `DATABASE_URL` — Prisma/Postgres
- `NEXT_PUBLIC_PRIVY_CONNECT_URL`, `PRIVY_CLIENT_ID`, `PRIVY_CLIENT_SECRET`
- `GEMINI_API_KEY` — LLM
- `FIRECRAWL_API_KEY` — web/news ingestion
- `X402_API_KEY` — purchases
- `ETH_RPC_URL`, `ERC8004_CONTRACT_ADDRESS`, `WALLET_PRIVATE_KEY` — on-chain attestations

Security & privacy notes
- Do not publish raw LLM prompts or private user data on-chain. Publish hashes or encrypted blobs and store full content off-chain with access controls.
- Sign on-chain attestations using a service key (`WALLET_PRIVATE_KEY`) and provide verifiable proof linking attestations to agent identity.

Next implementation steps
1. Implement `/api/auth/privy` popup handler and server-side session validation (required for real Privy connections).
2. Scaffold endpoints above as lightweight stubs returning mock success responses and wire frontend to them.
3. Implement worker to compute reputation after market resolution.
4. Add webhooks and payment handling for x402.
