import { NextResponse } from 'next/server';

// Premium research stub — returns additional mock articles and summaries.
export async function POST(req) {
  try {
    const body = await req.json();
    const market = body.market || {};

    const articles = [
      {
        url: `https://premium.example.com/deep-dive-${encodeURIComponent(market.title || 'market')}`,
        title: `Premium deep dive on ${market.title || 'market'}`,
        published_at: new Date().toISOString(),
        text: `Premium content covering detailed filings and datasets for ${market.title || 'market'}`,
        source: 'premium'
      },
      {
        url: `https://premium.example.com/dataset-${encodeURIComponent(market.title || 'market')}`,
        title: `Dataset summary for ${market.title || 'market'}`,
        published_at: new Date().toISOString(),
        text: `Structured dataset summary for ${market.title || 'market'}`,
        source: 'premium'
      }
    ];

    const summaries = articles.map(a => ({ url: a.url, summary: `${a.title} — short summary.` }));

    return NextResponse.json({ ok: true, articles, summaries, metadata: { provider: 'x402-premium-stub' } });
  } catch (err) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
