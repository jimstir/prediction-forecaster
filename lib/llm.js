import fetch from 'node-fetch';

async function callRemoteLLM(path, payload) {
  const url = process.env.GEMINI_API_URL;
  const key = process.env.GEMINI_API_KEY;
  if (!url || !key) throw new Error('GEMINI_API_URL or GEMINI_API_KEY not configured');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'authorization': `Bearer ${key}` },
    body: JSON.stringify({ path, payload })
  });
  return res.json();
}

// Generate 1-3 search queries from market via remote Gemini or local heuristic.
export async function generateSearchTerms(market) {
  if (process.env.GEMINI_API_URL && process.env.GEMINI_API_KEY) {
    try {
      const out = await callRemoteLLM('generate_search_terms', { market });
      if (out?.search_terms) return out.search_terms.slice(0, 3);
    } catch (err) {
      console.warn('generateSearchTerms remote failed', err?.message || err);
    }
  }

  // fallback heuristics
  const terms = [];
  if (market?.title) terms.push(market.title);
  if (market?.subtitle) terms.push(market.subtitle);
  if (market?.keywords) terms.push(...market.keywords.slice(0, 3));
  return terms.slice(0, 3);
}

// Analyze articles and market to produce forecast using remote Gemini or local heuristic.
export async function analyzeArticles({ market, articles, userProfile, hint = 'initial' } = {}) {
  if (process.env.GEMINI_API_URL && process.env.GEMINI_API_KEY) {
    try {
      const out = await callRemoteLLM('analyze_articles', { market, articles, userProfile, hint });
      if (out) return out;
    } catch (err) {
      console.warn('analyzeArticles remote failed', err?.message || err);
    }
  }

  // Local heuristic fallback (simple rules)
  const baseProb = market?.initial_probability ?? 50;
  const evidenceScore = Math.min(1, (articles?.length || 0) / 5);
  const confidence = Math.round((0.4 + 0.6 * evidenceScore) * 100 * (hint === 'final' ? 1.2 : 1));
  const purchaseAdditionalResearch = hint !== 'final' && (articles?.length || 0) < 3;

  const result = {
    probability: Math.round(baseProb + (evidenceScore - 0.5) * 20),
    confidence: Math.max(10, Math.min(99, confidence)),
    purchaseAdditionalResearch: Boolean(purchaseAdditionalResearch),
    reason: purchaseAdditionalResearch ? 'Insufficient evidence to make a high-confidence forecast' : 'Sufficient evidence'
  };

  if (hint === 'final') {
    result.reasoning = [`Reviewed ${articles.length} articles and market context`, `Confidence ${result.confidence}`];
  }

  return result;
}

export default { generateSearchTerms, analyzeArticles };
