import fs from 'fs';
import path from 'path';

function loadDotEnvIfNeeded() {
  if (process.env.FIRECRAWL_API_KEY) return;
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

  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    console.error('Missing FIRECRAWL_API_KEY in environment or .env');
    process.exit(2);
  }

  const url = 'https://api.firecrawl.dev/v2/search';

  const body = {
    query: 'latest sports news',
    limit: 5,
    sources: ['web'],
    categories: [],
    includeDomains: ['www.yahoo.com'],
    includeUrls: ['https://www.yahoo.com/news/science/articles/eli-lilly-says-next-gen-183355035.html'],
    excludeDomains: [],
    tbs: '',
    location: '',
    country: 'US',
    timeout: 60000,
    ignoreInvalidURLs: false,
    enterprise: [],
    scrapeOptions: {
      formats: ['markdown'],
      onlyMainContent: true,
      onlyCleanContent: false,
      maxAge: 172800000,
      waitFor: 0,
      mobile: false,
      skipTlsVerification: true,
      timeout: 60000,
      parsers: ['pdf'],
      location: { country: 'US' },
      removeBase64Images: true,
      blockAds: true,
      proxy: 'auto',
      storeInCache: true,
      lockdown: false,
      profile: { name: 'default', saveChanges: true }
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(body)
    });

    console.log('Status:', res.status);
    const txt = await res.text();
    try {
      console.log('Response JSON:', JSON.stringify(JSON.parse(txt), null, 2));
    } catch (e) {
      console.log('Response Text:', txt);
    }
    process.exit(res.ok ? 0 : 3);
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(4);
  }
}

main();
