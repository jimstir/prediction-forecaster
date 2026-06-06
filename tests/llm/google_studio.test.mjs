import fs from 'fs';
import path from 'path';

function loadDotEnvIfNeeded() {
  if (process.env.GOOGLE_STUDIO_API_KEY && process.env.GOOGLE_STUDIO_API_URL) return;
  const p = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(p)) return;
  const txt = fs.readFileSync(p, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadDotEnvIfNeeded();

  const url = process.env.GOOGLE_STUDIO_API_URL;
  const key = process.env.GOOGLE_STUDIO_API_KEY;

  if (!url || !key) {
    console.error('Missing GOOGLE_STUDIO_API_URL or GOOGLE_STUDIO_API_KEY in environment or .env');
    console.error('Please add the following to your .env:');
    console.error('GOOGLE_STUDIO_API_URL=https://generativelanguage.googleapis.com/v1/models/text-bison-001:generateText');
    console.error('GOOGLE_STUDIO_API_KEY=your_api_key');
    process.exit(2);
  }

  console.log('Using URL:', url);

  const headers = { 'Content-Type': 'application/json' };
  // Try common Google styles: API key as query param or Bearer header
  let fetchUrl = url;
  if (url.includes('?') || url.includes('=')) {
    fetchUrl = url + `&key=${encodeURIComponent(key)}`;
  } else {
    // prefer query param for Google API key
    fetchUrl = url + `?key=${encodeURIComponent(key)}`;
  }

  const body = {
    // generic simple prompt payload; many Google generative endpoints accept variants of this
    prompt: {
      text: 'Provide a one-sentence summary of why testing LLM connectivity is important.'
    },
    // keep output small
    maxOutputTokens: 64
  };

  try {
    const res = await fetch(fetchUrl, { method: 'POST', headers, body: JSON.stringify(body) });
    console.log('Status:', res.status);
    const text = await res.text();
    try {
      console.log('Response JSON:', JSON.stringify(JSON.parse(text), null, 2));
    } catch (e) {
      console.log('Response Text:', text);
    }
    process.exit(res.ok ? 0 : 3);
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(4);
  }
}

main();
