export function buildCuratedResponse(payload) {
  if (payload.event && payload.markets) {
    return {
      event: buildCuratedEvent(payload.event),
      markets: payload.markets.map(m => buildCuratedMarket(m))
    };
  }
  
  const m = payload?.market || payload || {};
  return buildCuratedMarket(m);
}

function buildCuratedEvent(e) {
  if (!e) return null;
  return {
    id: e.event_ticker,
    title: e.title,
    subtitle: e.sub_title,
    category: e.category,
    series: e.series_ticker,
    mutually_exclusive: e.mutually_exclusive,
  };
}

function buildCuratedMarket(m) {
  const toNumber = (v) => {
    if (v === undefined || v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const safeISO = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const current_probability = toNumber(m?.last_price_dollars);
  const bid_probability = toNumber(m?.yes_bid_dollars);
  const ask_probability = toNumber(m?.yes_ask_dollars);
  const spread = (bid_probability != null && ask_probability != null) ? Math.abs(ask_probability - bid_probability) : null;

  const resolutionIso = safeISO(m?.expiration_time || m?.expected_expiration_time);
  const nowIso = new Date().toISOString();
  const days_to_resolution = resolutionIso ? Math.max(0, Math.round((new Date(resolutionIso) - new Date(nowIso)) / (1000 * 60 * 60 * 24))) : null;

  const probability_previous = toNumber(m?.previous_price_dollars) || null;
  const change_24h = (probability_previous != null && current_probability != null) ? +(current_probability - probability_previous).toFixed(6) : null;

  const response = {
    market: {
      id: m?.id || m?.ticker || null,
      platform: 'Kalshi',

      title: m?.title || null,
      subtitle: m?.subtitle || m?.yes_sub_title || m?.sub_title || null,

      description: m?.description || m?.long_description || null,
      resolution_criteria: m?.rules_primary || m?.resolution_criteria || null,

      current_probability: current_probability,

      bid_probability: bid_probability,
      ask_probability: ask_probability,
      spread: spread,
    },

    timing: {
      created_at: safeISO(m?.created_time) || null,
      updated_at: safeISO(m?.updated_time) || nowIso,

      resolution_date: resolutionIso,

      days_to_resolution: days_to_resolution,
    },

    market_structure: {
      volume_total: toNumber(m?.volume_total) || toNumber(m?.volume_fp) || null,
      volume_24h: toNumber(m?.volume_24h_fp) || toNumber(m?.volume_24h) || null,

      liquidity: toNumber(m?.liquidity) || toNumber(m?.liquidity_fp) || null,
      open_interest: toNumber(m?.open_interest_fp) || toNumber(m?.open_interest) || null,
    },

    momentum: {
      probability_previous: probability_previous,
      probability_current: current_probability,

      change_24h: change_24h,
      change_7d: toNumber(m?.change_7d) || null,
      change_30d: toNumber(m?.change_30d) || null,
    },

    metadata: {
      category: m?.category || (Array.isArray(m?.tags) && m.tags.length ? m.tags[0] : null) || null,
      tags: Array.isArray(m?.tags) ? m.tags : [],

      event_id: m?.event_ticker || m?.event_id || null,
      market_type: m?.market_type || 'binary',
    },
  };

  return response;
}
