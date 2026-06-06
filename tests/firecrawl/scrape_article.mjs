import fetch from 'node-fetch';

const url = process.argv[2] || 'https://www.yahoo.com/news/science/articles/eli-lilly-says-next-gen-183355035.html';

function stripTags(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function main() {
  try {
    console.log('Fetching', url);
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Prediction-Forecaster/1.0)' } });
    if (!res.ok) {
      console.error('Fetch failed', res.status);
      process.exit(2);
    }
    const html = await res.text();

    // extract og:title or <title>
    const ogTitle = (html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) || [])[1];
    const titleTag = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
    const title = ogTitle || titleTag || null;

    // extract published time
    const pub = (html.match(/<meta\s+property=["']article:published_time["']\s+content=["']([^"']+)["']/i) || [])[1] || (html.match(/<time[^>]*datetime=["']([^"']+)["']/i) || [])[1] || null;

    // attempt to find <article>...</article>
    const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
    let bodyText = null;
    if (articleMatch) {
      bodyText = stripTags(articleMatch[0]);
    } else {
      // try common Yahoo class
      const bodyMatch = html.match(/<div[^>]+class=["'][^"']*(?:caas-body|caas-article-body|article-body)[^"']*["'][\s\S]*?<\/div>/i);
      if (bodyMatch) bodyText = stripTags(bodyMatch[0]);
    }

    // fallback: take first large <p> block
    if (!bodyText) {
      const pMatches = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => m[1]).filter(Boolean);
      const joined = pMatches.join('\n\n');
      bodyText = stripTags(joined).slice(0, 4000);
    }

    const result = { url, title, published: pub, snippet: bodyText ? bodyText.slice(0, 2000) : null };
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(3);
  }
}

main();
