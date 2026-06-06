import assert from 'assert';
import { buildCuratedResponse } from '../../app/api/kalshi/curator.js';

function run() {
  const payload = {
    market: {
      id: 'MKT-123',
      ticker: 'TEST-1',
      title: 'Will X happen by Y?',
      subtitle: 'Short subtitle',
      description: 'A fuller description of the market',
      rules_primary: 'Market resolves if X occurs before Y',
      last_price_dollars: '0.55',
      yes_bid_dollars: '0.54',
      yes_ask_dollars: '0.56',
      previous_price_dollars: '0.47',
      created_time: '2026-06-01T00:00:00Z',
      updated_time: '2026-06-05T00:00:00Z',
      expiration_time: '2026-07-13T00:00:00Z',

      volume_total: '1200000',
      volume_24h_fp: '85000',
      liquidity: '300000',
      open_interest_fp: '420000',

      tags: ['Federal Reserve', 'Interest Rates'],
      event_ticker: 'EVT-1',
      market_type: 'binary',
    },
  };

  const res = buildCuratedResponse(payload);

  try {
    assert.ok(res && typeof res === 'object', 'response must be object');
    assert.ok(res.market && typeof res.market === 'object', 'market key missing');
    assert.strictEqual(res.market.id, 'MKT-123');
    assert.strictEqual(res.market.platform, 'Kalshi');
    assert.strictEqual(res.market.title, 'Will X happen by Y?');
    assert.strictEqual(res.market.current_probability, 0.55);

    assert.ok(res.timing && res.timing.resolution_date, 'timing.resolution_date missing');
    assert.ok(Number.isFinite(res.market.current_probability), 'current_probability should be numeric');

    assert.ok(res.market_structure && res.market_structure.volume_total === 1200000, 'volume_total expected');
    assert.deepStrictEqual(res.metadata.tags, ['Federal Reserve', 'Interest Rates']);

    console.log('PASS: Kalshi curated response test');
    process.exit(0);
  } catch (err) {
    console.error('FAIL:', err.message);
    console.error(err);
    process.exit(2);
  }
}

run();
