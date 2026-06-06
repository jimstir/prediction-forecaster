import { orchestrateRecommendation } from '../lib/agent.js';

async function run() {
  const market = {
    title: 'Will X Corp beat Q3 revenue expectations?',
    subtitle: 'X Corp reported mixed guidance ahead of earnings',
    initial_probability: 55,
    keywords: ['X Corp', 'earnings', 'Q3']
  };

  const res = await orchestrateRecommendation({ market });
  console.log('=== Initial ===');
  console.log(JSON.stringify(res.initial, null, 2));
  console.log('=== Premium (if any) ===');
  console.log(JSON.stringify(res.premium, null, 2));
  console.log('=== Final ===');
  console.log(JSON.stringify(res.final, null, 2));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
