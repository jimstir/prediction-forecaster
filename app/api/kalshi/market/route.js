import { NextResponse } from 'next/server';
import { buildCuratedResponse } from '../curator.js';

const KALSHI_BASE = 'https://external-api.kalshi.com/trade-api/v2/events';

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const ticker = url.searchParams.get('ticker');
    if (!ticker) return NextResponse.json({ error: 'ticker query required' }, { status: 400 });

    const key = process.env.KALSHI_API_KEY;
    const headers = { 'Content-Type': 'application/json' };
    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
    }

    const res = await fetch(`${KALSHI_BASE}/${encodeURI(ticker.toUpperCase())}`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Kalshi fetch failed: ${res.status}`, details: text }, { status: res.status });
    }

    const payload = await res.json();
    const response = buildCuratedResponse(payload);
    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

