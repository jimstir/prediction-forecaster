import { NextResponse } from 'next/server';
import { orchestrateRecommendation } from '../../../lib/agent.js';

export async function POST(req) {
  try {
    const body = await req.json();
    const market = body.market || body;

    if (!market) return NextResponse.json({ error: 'market required' }, { status: 400 });

    const result = await orchestrateRecommendation({ market, userProfile: body.userProfile });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
 
