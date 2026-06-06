---
title: FORECASTER
name: Prediction Market Forecaster
status: draft
category: Architecture / Spec
contributors: Jimmy Debe <@jimstir>
---

## Abstract

This document is a for the Forecaster tool market-insight system for prediction-market participants.

## Goals

- Surface explainable LLM reasoning and audit trails for recommendations.
- Ingest real-time news to contextualize recommendations.
- Support on-demand purchase of deeper research via an `x402` purchase component.
- Anchor agent identities and reputation via ERC-8004 attestations.

## Terminology

The key words "MUST", "SHOULD", "MAY", "REQUIRED", and similar are to be interpreted per [RFC 2119].

## High-level Architecture

- LLM Reasoning: Gemini API used for ranking, relation classification, and explanation generation.
- Identity: Privy for wallet-based authentication and account linking.
- News & Signals: Firecrawl API for news ingestion and semantic signal extraction.
- Purchase Component: `x402`—client + backend flow to request and pay for additional research packages.
- Reputation: On-chain attestations and agent identities using ERC-8004.
- Database: Postgres (Prisma) for profiles, preferences, cached recommendations, and report logs.

## Integrations

- Gemini LLM (LLM Reasoning)
  - The system MUST use Gemini (or a configurable LLM provider) to perform:
    - Recommendation ranking and scoring.
    - Relationship classification between markets (same-outcome detection).
    - Rationale and human-readable explanations.
  - Responses MUST include a short rationale, the model identifier, and a deterministic prompt hash for auditing.

- Privy (Wallet & Identity)
  - The frontend SHOULD use Privy to authenticate and map a session to a `user_identity` (wallet address).
  - The server MUST accept Privy-issued session tokens and validate them before performing profile-scoped operations.
  - The canonical `user_identity` stored in the DB MUST be a normalized lowercase wallet address.

- Firecrawl (News & Signals)
  - Firecrawl SHOULD be used to fetch news articles, timelines, and signal extractions (entities, dates, event likelihoods).
  - News signals MUST be time-windowed and scored for recency and relevance before being presented to the LLM as context.

- x402 Purchase Component
  - The `x402` component is a lightweight purchase flow allowing agents to request paid research from the backend.
  - The frontend MUST present a transparent price, scope, and expected deliverable for each research SKU.
  - Purchases MUST create a server-side `research_request` record and optionally escrow funds or call an external payment provider.

- ERC-8004 (Agent Identity & Reputation)
  - Each LLM agent used for a user's recommendations SHOULD have an on-chain ERC-8004 identity attested by the platform (or a marketplace of agents).
  - Agent attestations MUST include: agent creation timestamp, model identifier, and a hash pointing to the agent's report logs (off-chain storage reference).
  - Reputation metrics (accuracy, user feedback, number of requests) SHOULD be derivable from on-chain attestations + off-chain logs.

## Data Models

The Forecaster follows and extends the `profile-schema` and `market-schema` patterns. Fields shown are RECOMMENDED.

### Profile Schema (RECOMMENDED)

- `user_identity` (string, REQUIRED): normalized wallet address
- `display_name` (string, OPTIONAL)
- `explicit_interests` (object): category → weight
- `inferred_interests` (object): topic → { interest_score, skill_score, engagement_score }
- `market_settings` (object): preferred market types / timeframes / liquidity
- `performance` (object): wins, losses, naively computed ROI
- `embedding_vector` (array<float>)
- `erc8004_agent_id` (string, OPTIONAL): on-chain agent identity
- `reputation_summary` (object, OPTIONAL): aggregated reputation from ERC-8004 + feedback
- `last_updated` (timestamp)

Notes:

- `user_identity` MUST be authoritative and derived from Privy-validated sessions.
- `embedding_vector` **MAY** be generated from wallet history + explicit interests.

### Market Schema (RECOMMENDED)

- `id` (string, REQUIRED)
- `title` (string)
- `description` (string)
- `category` (string)
- `sub_categories` (array<string>)
- `market_type` (string) // binary, scalar, multi-outcome
- `time_horizon_days` (int)
- `resolution_date` (timestamp)
- `resolution_type` (string)
- `liquidity` (int)
- `volatility` (int)
- `difficulty` (int)
- `embedding` (array<float>)
- `source` (string) // e.g. polymarket-gamma
- `last_fetched` (timestamp)

### Recommendation Output (LLM)

LLM outputs provided to the frontend MUST include:

- `ranked_markets`: [{ market_id, score, rationale_snippet }]
- `reasoning_log`: structured reasoning for the report log (stored off-chain)
- `model_id`: string (e.g. `gemini-2026-06-01`)
- `prompt_hash`: deterministic hash of the prompt + inputs
- `timestamp`

## News Ingestion & Context Window

- Firecrawl results MUST be filtered to a relevance window (configurable, e.g. last 7 days).
- Each news item fed to the LLM SHOULD include: `title`, `url`, `published_at`, `snippet`, `confidence_score`.
- The server MUST de-duplicate news items and apply a lightweight source-trust weighting before inclusion.

## LLM Usage Patterns

- Recommendation Pass
  - Input: `markets` (top-N candidates), `user_profile`, recent `news_signals`.
  - Task: score & rank markets for this user; optionally propose market pairs (same-outcome detection).
  - Output: `ranked_markets`, `reasoning_log`.

- Relation Classifier Pass
  - Input: pair(s) of market summaries or embeddings.
  - Task: classify `is_same_outcome` with `confidence` and short `rationale`.

- Explanation / Chat Pass
  - Interactive user queries routed to Gemini with context limited to the selected market, user's profile, and recent news.

Operational constraints:

- Prompts MUST be truncated or summarized to keep LLM context within provider limits.
- Each LLM call MUST record `model_id`, `prompt_hash`, token usage (if available), and provider response metadata.

## Agent Identity, Audit Trail & Reputation (ERC-8004)

- When a user first requests recommendations, the platform SHOULD mint or assign an ERC-8004 agent identity for the recommendation agent acting on that profile.
- Each recommendation and insight generation MUST create an off-chain `report_log` and write a corresponding on-chain attestation containing at minimum: agent_id, report_hash, timestamp.
- Reputation signals MUST be derived from comparing historical `reasoning_log` predictions vs actual market outcomes and user feedback.

## Purchase Flow: x402 Research Requests

- The frontend MUST expose a `Buy Research` action with clear scope, price, and ETA.
- On purchase:
  1. Frontend calls `POST /api/purchase` to create `research_request` (includes `wallet`, `sku`, `metadata`).
  2. Backend returns `request_id` + payment instructions or initiates payment (on-chain or off-chain).
  3. After payment, backend schedules research work and updates the request status.
  4. Resulting research report stored off-chain; hash attached to `research_request` and optionally attested via ERC-8004.
- Purchases MUST be auditable and tied to the `user_identity`.

## API Endpoints (minimum)

- `GET /api/preferences?address=` — fetch preferences (Privy-validated)
- `PUT /api/preferences` — update preferences (Privy token required)
- `POST /api/recommendations` — generate or fetch cached recommendations for `user_identity`
- `GET /api/recommendations/:id` — fetch saved recommendation report
- `POST /api/insights` — ask for market-specific LLM insights
- `POST /api/purchase` — create a purchase/research request (x402)
- `GET /api/news` — server-side endpoint to query Firecrawl results

Security:
- All profile-scoped endpoints MUST validate Privy session tokens.
- Secrets for Gemini, Firecrawl, payment providers MUST be stored in environment variables and not committed.

## Privacy & Data Retention

- Users MUST be informed which artifacts are stored off-chain and which are attested on-chain (ERC-8004).
- Sensitive logs (raw model prompts, full user embeddings) SHOULD be encrypted at rest.
- Default retention for cached recommendations SHOULD be 30 days unless the user opts in to longer storage.

## Deployment & Operational Notes

- LLM calls to Gemini **MAY** be rate-limited and should use a retry/backoff strategy.
- News ingestion (Firecrawl) SHOULD run as a scheduled worker with dedupe and source-scoring.
- The `x402` purchase flow MUST be idempotent and resilient to payment interruptions.

## Next Steps (implementation roadmap)

1. Define request/response JSON shapes for `/api/recommendations` and `/api/insights`.
2. Implement Privy authentication middleware and normalize `user_identity` mapping.
3. Wire Firecrawl ingestion worker and a news-to-signals transformer.
4. Implement Gemini prompt templates and prompt-hash auditing.
5. Implement `x402` purchase endpoints and minimal payment integration.
6. Implement ERC-8004 attestation flow for agent identities.

## References

- Polymarket Gamma API — event & market data
- Gemini API — LLM provider (configurable)
- Firecrawl API — news and signal extraction
- Privy — wallet authentication
- ERC-8004 — proposed standard for signed attestations

