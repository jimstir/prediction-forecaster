import { NextResponse } from 'next/server';

// In-memory preferences store for development only.
const store = new Map();

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'address query is required' }, { status: 400 });
  }

  const prefs = store.get(address.toLowerCase()) || {
    categories: [],
    minConfidence: 0.5,
  };

  return NextResponse.json({ preferences: prefs });
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { address, ...prefs } = body || {};
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
    store.set(address.toLowerCase(), prefs);
    return NextResponse.json({ preferences: prefs });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
