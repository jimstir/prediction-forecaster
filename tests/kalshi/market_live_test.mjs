import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { buildCuratedResponse } from '../../app/api/kalshi/curator.js';

async function readKeyFromEnvExample() {
  const p = path.resolve(process.cwd(), '.env.example');
  if (!fs.existsSync(p)) return null;
  const txt = fs.readFileSync(p, 'utf8');
  const lines = txt.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('KALSHI_API_KEY=')) {
      const idx = trimmed.indexOf('=');
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      return val || null;
    }
  }
  return null;
}

async function main() {
  const key = process.env.KALSHI_API_KEY || await readKeyFromEnvExample();
  if (!key) {
    console.warn('No KALSHI_API_KEY found, running without authorization. Kalshi may rate-limit this request.');
  }

  const ticker = process.argv[2] || 'kxnba-26';
  const url = `https://external-api.kalshi.com/trade-api/v2/events/${encodeURI(ticker.toUpperCase())}`;

  try {
    console.log('Fetching', url);
    const headers = { 'Content-Type': 'application/json' };
    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Kalshi fetch failed', res.status, text);
      process.exit(3);
    }

    const payload = await res.json();
    const curated = buildCuratedResponse(payload);
    console.log(JSON.stringify(curated, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error fetching Kalshi:', err);
    process.exit(4);
  }
}

main();
