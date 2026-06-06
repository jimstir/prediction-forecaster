import fetch from 'node-fetch';
import { purchaseResearch } from './x402.js';
import { generateSearchTerms, analyzeArticles } from './llm.js';

async function callFirecrawl(queries) {
  // If FIRECRAWL_API_URL is configured, call it with queries
  const fcUrl = process.env.FIRECRAWL_API_URL;
  const fcKey = process.env.FIRECRAWL_API_KEY;
  if (fcUrl && fcKey) {
    try {
      const res = await fetch(fcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': `Bearer ${fcKey}` },
        body: JSON.stringify({ queries: queries.slice(0, 5) })
      });
      const json = await res.json();
      // Expecting an array of article objects in json.articles or json
      const articles = json?.articles ?? json;
      if (Array.isArray(articles)) return articles.slice(0, 5);
    } catch (err) {
      console.warn('Firecrawl call failed, falling back to mock', err?.message || err);
    }
  }

  // Lightweight local fallback — Returns up to 3 mock articles per query (deduped by url).
  const articles = [];
  for (const q of queries.slice(0, 3)) {
    articles.push({
      url: `https://example.com/article?q=${encodeURIComponent(q)}`,
      title: `Article for ${q}`,
      published_at: new Date().toISOString(),
      text: `Mock content about ${q}`,
      source: 'mock'
    });
  }
  return articles;
}
export async function orchestrateRecommendation({ market, userProfile } = {}) {
  // 1. Generate 1-3 search queries from market fields
  const queries = [];
  if (market?.title) queries.push(market.title);
  if (market?.subtitle) queries.push(market.subtitle);
  if (!queries.length && market?.keywords) queries.push(...market.keywords.slice(0, 3));
  if (!queries.length) {
    // ask LLM to generate queries when possible
    try {
      const gen = await generateSearchTerms(market);
      if (gen && gen.length) {
        queries.push(...gen);
      } else {
        queries.push('generic market news');
      }
    } catch (err) {
      queries.push('generic market news');
    }
  }

  // 2. Firecrawl search
  const articles = await callFirecrawl(queries);

  // 3. Initial LLM pass (asks for forecast and whether to purchase more)
  const initial = await analyzeArticles({ market, articles, userProfile, hint: 'initial' });

  // 4. If LLM requests additional research, perform x402 purchase via Agent Wallet
  let premium = null;
  if (initial.purchaseAdditionalResearch) {
    // attempt purchase; throws on failure.
    const purchaseResult = await purchaseResearch({ market, agentNote: 'Autonomous research purchase' });
    if (purchaseResult?.ok) {
      // fetch premium research from internal premium endpoint
      try {
        const res = await fetch(process.env.PREMIUM_RESEARCH_URL || 'http://localhost:3000/api/premium', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ market })
        });
        premium = await res.json();
      } catch (err) {
        // premium fetch failed — leave premium null and continue
        premium = null;
      }
    }
  }

  // 5. Final LLM pass uses original + premium
  const finalArticles = [...articles];
  if (premium?.articles) {
    for (const a of premium.articles) {
      if (!finalArticles.find(x => x.url === a.url)) finalArticles.push(a);
    }
  }

  const final = await analyzeArticles({ market, articles: finalArticles, userProfile, hint: 'final' });

  return {
    initial,
    premium: premium ?? null,
    final
  };
}

export default { orchestrateRecommendation };
