import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { marketId, walletAddress } = body || {};

    // Minimal stubbed response — replace with real LLM + news pipeline
    const recommendations = [
      {
        marketId: marketId || 'unknown',
        recommendation: 'no-opinion',
        confidence: 0.5,
        rationale: 'This is a placeholder recommendation. Integrate Gemini + Firecrawl to generate real outputs.',
        sources: [],
      },
    ];

    return NextResponse.json({ recommendations, requestedBy: walletAddress ?? null });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
