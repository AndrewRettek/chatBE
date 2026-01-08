/**
 * Optimization Savings Calculator
 *
 * Shows before/after costs with different optimization strategies
 * Based on your actual usage: 674 requests/day, 15.5k input tokens/request
 */

interface OptimizationScenario {
  name: string;
  provider: string;
  model: string;
  inputPricePerM: number;
  outputPricePerM: number;
  avgInputTokensPerRequest: number;
  avgOutputTokensPerRequest: number;
  requestsPerDay: number;
  description: string;
}

const scenarios: OptimizationScenario[] = [
  {
    name: 'Current (Baseline)',
    provider: 'Together.ai',
    model: 'DeepSeek R1',
    inputPricePerM: 3.00,
    outputPricePerM: 7.00,
    avgInputTokensPerRequest: 15_546,
    avgOutputTokensPerRequest: 581,
    requestsPerDay: 674,
    description: 'Your current setup - no optimizations'
  },
  {
    name: 'Switch to DeepInfra V3.2',
    provider: 'DeepInfra',
    model: 'DeepSeek V3.2',
    inputPricePerM: 0.26,
    outputPricePerM: 0.39,
    avgInputTokensPerRequest: 15_546,
    avgOutputTokensPerRequest: 581,
    requestsPerDay: 674,
    description: 'Just change provider - no other changes'
  },
  {
    name: '+ Context Pruning (50%)',
    provider: 'DeepInfra',
    model: 'DeepSeek V3.2',
    inputPricePerM: 0.26,
    outputPricePerM: 0.39,
    avgInputTokensPerRequest: 7_773, // 50% reduction
    avgOutputTokensPerRequest: 581,
    requestsPerDay: 674,
    description: 'Limit conversation history to 2k tokens'
  },
  {
    name: '+ RAG Optimization (30%)',
    provider: 'DeepInfra',
    model: 'DeepSeek V3.2',
    inputPricePerM: 0.26,
    outputPricePerM: 0.39,
    avgInputTokensPerRequest: 5_441, // Additional 30% reduction
    avgOutputTokensPerRequest: 581,
    requestsPerDay: 674,
    description: 'Reduce RAG chunks from 5+ to 3'
  },
  {
    name: '+ Response Caching (20%)',
    provider: 'DeepInfra',
    model: 'DeepSeek V3.2',
    inputPricePerM: 0.26,
    outputPricePerM: 0.39,
    avgInputTokensPerRequest: 5_441,
    avgOutputTokensPerRequest: 581,
    requestsPerDay: 539, // 20% fewer API calls due to cache
    description: 'Cache repeated queries for 5 minutes'
  },
  {
    name: 'Aggressive Optimization',
    provider: 'DeepInfra',
    model: 'DeepSeek V3.2',
    inputPricePerM: 0.26,
    outputPricePerM: 0.39,
    avgInputTokensPerRequest: 3_500, // 77.5% reduction
    avgOutputTokensPerRequest: 581,
    requestsPerDay: 472, // 30% cache hit rate
    description: 'Context to 1.5k + 3 RAG chunks + 30% cache'
  }
];

function calculateMonthlyCost(scenario: OptimizationScenario) {
  const requestsPerMonth = scenario.requestsPerDay * 30;
  const inputTokensPerMonth = requestsPerMonth * scenario.avgInputTokensPerRequest;
  const outputTokensPerMonth = requestsPerMonth * scenario.avgOutputTokensPerRequest;

  const inputCost = (inputTokensPerMonth / 1_000_000) * scenario.inputPricePerM;
  const outputCost = (outputTokensPerMonth / 1_000_000) * scenario.outputPricePerM;
  const totalCost = inputCost + outputCost;

  return {
    requestsPerMonth,
    inputTokensPerMonth,
    outputTokensPerMonth,
    inputCost,
    outputCost,
    totalCost,
    costPerRequest: totalCost / requestsPerMonth
  };
}

console.log('╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                        OPTIMIZATION SAVINGS CALCULATOR                               ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

console.log('Based on your actual usage from Together.ai analytics (Nov 1 - Jan 8, 2026)\n');

// Calculate baseline
const baseline = calculateMonthlyCost(scenarios[0]);

console.log('═══════════════════════════════════════════════════════════════════════════════════════');
console.log('Scenario                          │ Monthly Cost │  vs Baseline │ Input Tokens │ Reqs/Day');
console.log('──────────────────────────────────┼──────────────┼──────────────┼──────────────┼─────────');

scenarios.forEach(scenario => {
  const cost = calculateMonthlyCost(scenario);
  const savings = baseline.totalCost - cost.totalCost;
  const savingsPercent = ((savings / baseline.totalCost) * 100).toFixed(1);

  const name = scenario.name.padEnd(34);
  const monthlyCost = `$${cost.totalCost.toFixed(2)}`.padStart(12);
  const vsBaseline = savings > 0
    ? `-$${savings.toFixed(0)} (${savingsPercent}%)`.padStart(12)
    : 'BASELINE'.padStart(12);
  const inputTokens = `${(scenario.avgInputTokensPerRequest / 1000).toFixed(1)}k`.padStart(12);
  const reqsPerDay = scenario.requestsPerDay.toString().padStart(9);

  console.log(`${name}│ ${monthlyCost} │ ${vsBaseline} │ ${inputTokens} │ ${reqsPerDay}`);
});

console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

// Detailed breakdown
console.log('\n╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                           DETAILED COST BREAKDOWN                                    ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

scenarios.forEach((scenario, idx) => {
  const cost = calculateMonthlyCost(scenario);
  const savings = baseline.totalCost - cost.totalCost;
  const savingsPercent = ((savings / baseline.totalCost) * 100).toFixed(1);

  console.log(`\n${idx + 1}. ${scenario.name}`);
  console.log(`   ${scenario.description}`);
  console.log(`   Provider: ${scenario.provider} ${scenario.model}`);
  console.log(`   Pricing: $${scenario.inputPricePerM}/M input, $${scenario.outputPricePerM}/M output`);
  console.log(`\n   Usage per month:`);
  console.log(`     Requests: ${cost.requestsPerMonth.toLocaleString()}`);
  console.log(`     Input tokens: ${cost.inputTokensPerMonth.toLocaleString()} (${scenario.avgInputTokensPerRequest.toLocaleString()}/request)`);
  console.log(`     Output tokens: ${cost.outputTokensPerMonth.toLocaleString()} (${scenario.avgOutputTokensPerRequest.toLocaleString()}/request)`);
  console.log(`\n   Monthly cost:`);
  console.log(`     Input: $${cost.inputCost.toFixed(2)}`);
  console.log(`     Output: $${cost.outputCost.toFixed(2)}`);
  console.log(`     TOTAL: $${cost.totalCost.toFixed(2)}`);
  console.log(`     Per request: $${cost.costPerRequest.toFixed(6)}`);

  if (idx > 0) {
    console.log(`\n   💰 Savings: $${savings.toFixed(2)}/month (${savingsPercent}% reduction)`);
  }
});

console.log('\n\n╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                              IMPLEMENTATION ROADMAP                                  ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

const roadmap = [
  {
    phase: 'Phase 1: Quick Win',
    duration: '1 day',
    steps: [
      'Get DeepInfra API key (free signup)',
      'Update .env with DEEPINFRA_API_KEY',
      'Change API_URL to https://api.deepinfra.com/v1/openai/chat/completions',
      'Change model to "deepseek-ai/DeepSeek-V3.2"',
      'Test with a few requests'
    ],
    savings: calculateMonthlyCost(scenarios[1]).totalCost,
    effort: 'Low'
  },
  {
    phase: 'Phase 2: Context Pruning',
    duration: '2-3 hours',
    steps: [
      'Add pruneConversationHistory() function',
      'Set MAX_CONVERSATION_TOKENS = 2000',
      'Test conversation quality',
      'Adjust token limit based on quality'
    ],
    savings: calculateMonthlyCost(scenarios[2]).totalCost,
    effort: 'Medium'
  },
  {
    phase: 'Phase 3: RAG Optimization',
    duration: '1-2 hours',
    steps: [
      'Limit RAG results to top 3 chunks',
      'Add chunk ranking/scoring',
      'Test retrieval quality',
      'Monitor relevance metrics'
    ],
    savings: calculateMonthlyCost(scenarios[3]).totalCost,
    effort: 'Low'
  },
  {
    phase: 'Phase 4: Response Caching',
    duration: '2-3 hours',
    steps: [
      'Add in-memory cache Map',
      'Implement cache key generation',
      'Set TTL to 5 minutes',
      'Add cache hit/miss logging',
      '(Optional) Migrate to Redis for production'
    ],
    savings: calculateMonthlyCost(scenarios[4]).totalCost,
    effort: 'Medium'
  }
];

roadmap.forEach((phase, idx) => {
  const baseline = calculateMonthlyCost(scenarios[0]).totalCost;
  const savings = baseline - phase.savings;
  const savingsPercent = ((savings / baseline) * 100).toFixed(1);

  console.log(`\n${phase.phase}`);
  console.log(`Duration: ${phase.duration} | Effort: ${phase.effort}`);
  console.log(`\nSteps:`);
  phase.steps.forEach(step => console.log(`  ${idx + 1}. ${step}`));
  console.log(`\n💰 Monthly cost after this phase: $${phase.savings.toFixed(2)}`);
  console.log(`💰 Total savings: $${savings.toFixed(2)}/month (${savingsPercent}% reduction)`);
});

console.log('\n\n╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                                   SUMMARY                                            ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

const current = calculateMonthlyCost(scenarios[0]);
const optimized = calculateMonthlyCost(scenarios[4]);
const totalSavings = current.totalCost - optimized.totalCost;
const totalSavingsPercent = ((totalSavings / current.totalCost) * 100).toFixed(1);

console.log(`📊 CURRENT STATE:`);
console.log(`   Monthly cost: $${current.totalCost.toFixed(2)}`);
console.log(`   Average input per request: ${scenarios[0].avgInputTokensPerRequest.toLocaleString()} tokens`);
console.log(`   Requests per day: ${scenarios[0].requestsPerDay}`);
console.log('');

console.log(`✨ OPTIMIZED STATE:`);
console.log(`   Monthly cost: $${optimized.totalCost.toFixed(2)}`);
console.log(`   Average input per request: ${scenarios[4].avgInputTokensPerRequest.toLocaleString()} tokens`);
console.log(`   Requests per day: ${scenarios[4].requestsPerDay} (after caching)`);
console.log('');

console.log(`💰 TOTAL SAVINGS:`);
console.log(`   Per month: $${totalSavings.toFixed(2)}`);
console.log(`   Per year: $${(totalSavings * 12).toFixed(2)}`);
console.log(`   Reduction: ${totalSavingsPercent}%`);
console.log('');

console.log(`⏱️  IMPLEMENTATION TIME:`);
console.log(`   Total: ~6-10 hours over 2-3 days`);
console.log(`   Can be done incrementally`);
console.log('');

console.log(`🎯 ROI:`);
const hourlyValue = totalSavings / 10; // 10 hours of work
console.log(`   Savings per hour invested: $${hourlyValue.toFixed(2)}/month`);
console.log(`   Payback period: Immediate (first month)`);
console.log('');

export { scenarios, calculateMonthlyCost };
