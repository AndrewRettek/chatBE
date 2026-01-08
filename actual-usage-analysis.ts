/**
 * Actual Usage Analysis from Together.ai Analytics
 * Period: Nov 1, 2025 - Jan 8, 2026 (69 days)
 * Model: DeepSeek-R1
 *
 * Data from PDF:
 * - Total Requests: 46,500
 * - Input Tokens: 722,900,000
 * - Output Tokens: 27,000,000
 * - Total Tokens: 749,900,000
 */

interface ActualUsage {
  periodDays: number;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface PricingOption {
  provider: string;
  model: string;
  inputPricePerM: number;
  outputPricePerM: number;
  available: boolean;
  notes?: string;
}

const actualUsage: ActualUsage = {
  periodDays: 69, // Nov 1, 2025 - Jan 8, 2026
  requests: 46_500,
  inputTokens: 722_900_000,
  outputTokens: 27_000_000,
  totalTokens: 749_900_000,
};

const pricingOptions: PricingOption[] = [
  {
    provider: 'Together.ai',
    model: 'DeepSeek R1',
    inputPricePerM: 3.00,
    outputPricePerM: 7.00,
    available: true,
    notes: 'Current (reasoning model)',
  },
  {
    provider: 'Together.ai',
    model: 'DeepSeek R1 Throughput',
    inputPricePerM: 0.55,
    outputPricePerM: 2.19,
    available: true,
    notes: 'Optimized version',
  },
  {
    provider: 'Together.ai',
    model: 'DeepSeek V3.2',
    inputPricePerM: 0.60,
    outputPricePerM: 1.70,
    available: true,
    notes: 'Non-reasoning model',
  },
  {
    provider: 'DeepInfra',
    model: 'DeepSeek V3.2',
    inputPricePerM: 0.26,
    outputPricePerM: 0.39,
    available: true,
    notes: 'Cheapest option (no R1)',
  },
  {
    provider: 'DeepInfra',
    model: 'DeepSeek R1',
    inputPricePerM: 0.0,
    outputPricePerM: 0.0,
    available: false,
    notes: 'Not available on DeepInfra',
  },
];

function calculateCost(usage: ActualUsage, pricing: PricingOption) {
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputPricePerM;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPricePerM;
  const totalCost = inputCost + outputCost;

  // Calculate monthly equivalent
  const monthlyCost = (totalCost / usage.periodDays) * 30;

  return {
    inputCost,
    outputCost,
    totalCost,
    monthlyCost,
  };
}

console.log('╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    ACTUAL USAGE ANALYSIS FROM TOGETHER.AI                            ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

console.log('Period: November 1, 2025 - January 8, 2026 (69 days)\n');

console.log('📊 ACTUAL USAGE STATISTICS:');
console.log(`   Total Requests: ${actualUsage.requests.toLocaleString()}`);
console.log(`   Input Tokens: ${actualUsage.inputTokens.toLocaleString()}`);
console.log(`   Output Tokens: ${actualUsage.outputTokens.toLocaleString()}`);
console.log(`   Total Tokens: ${actualUsage.totalTokens.toLocaleString()}`);
console.log('');

// Calculate average per request
const avgInputPerRequest = Math.round(actualUsage.inputTokens / actualUsage.requests);
const avgOutputPerRequest = Math.round(actualUsage.outputTokens / actualUsage.requests);
const avgTotalPerRequest = Math.round(actualUsage.totalTokens / actualUsage.requests);

console.log('📈 AVERAGE PER REQUEST:');
console.log(`   Input tokens: ${avgInputPerRequest.toLocaleString()} tokens/request`);
console.log(`   Output tokens: ${avgOutputPerRequest.toLocaleString()} tokens/request`);
console.log(`   Total tokens: ${avgTotalPerRequest.toLocaleString()} tokens/request`);
console.log('');

// Daily averages
const dailyRequests = Math.round(actualUsage.requests / actualUsage.periodDays);
const dailyInputTokens = Math.round(actualUsage.inputTokens / actualUsage.periodDays);
const dailyOutputTokens = Math.round(actualUsage.outputTokens / actualUsage.periodDays);

console.log('📅 DAILY AVERAGES:');
console.log(`   Requests: ${dailyRequests.toLocaleString()} requests/day`);
console.log(`   Input tokens: ${dailyInputTokens.toLocaleString()} tokens/day`);
console.log(`   Output tokens: ${dailyOutputTokens.toLocaleString()} tokens/day`);
console.log('');

console.log('\n╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                           COST COMPARISON BY PROVIDER                                ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

console.log('═══════════════════════════════════════════════════════════════════════════════════════');
console.log('Provider & Model                  │ 69-Day Cost │ Monthly Cost │ Savings vs Current');
console.log('──────────────────────────────────┼─────────────┼──────────────┼───────────────────');

let currentCost = 0;

pricingOptions.forEach((option) => {
  if (!option.available) return;

  const cost = calculateCost(actualUsage, option);
  const isCurrent = option.provider === 'Together.ai' && option.model === 'DeepSeek R1';

  if (isCurrent) {
    currentCost = cost.monthlyCost;
  }

  const savings = currentCost > 0 ? currentCost - cost.monthlyCost : 0;
  const savingsPercent = currentCost > 0 ? ((savings / currentCost) * 100) : 0;

  const label = `${option.provider} ${option.model}`.padEnd(34);
  const periodCostStr = `$${cost.totalCost.toFixed(2)}`.padStart(11);
  const monthlyCostStr = `$${cost.monthlyCost.toFixed(2)}`.padStart(12);

  let savingsStr: string;
  if (isCurrent) {
    savingsStr = 'CURRENT'.padStart(19);
  } else if (savings > 0) {
    savingsStr = `-$${savings.toFixed(2)} (${savingsPercent.toFixed(1)}%)`.padStart(19);
  } else {
    savingsStr = 'N/A'.padStart(19);
  }

  console.log(`${label}│ ${periodCostStr} │ ${monthlyCostStr} │ ${savingsStr}`);
});

console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

console.log('\n╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                            DETAILED COST BREAKDOWN                                   ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

pricingOptions.forEach((option) => {
  if (!option.available) return;

  const cost = calculateCost(actualUsage, option);

  console.log(`\n${option.provider} - ${option.model}`);
  console.log(`  Pricing: $${option.inputPricePerM}/M input, $${option.outputPricePerM}/M output`);
  console.log(`  69-Day Period Cost:`);
  console.log(`    Input:  $${cost.inputCost.toFixed(2)} (${actualUsage.inputTokens.toLocaleString()} tokens)`);
  console.log(`    Output: $${cost.outputCost.toFixed(2)} (${actualUsage.outputTokens.toLocaleString()} tokens)`);
  console.log(`    TOTAL:  $${cost.totalCost.toFixed(2)}`);
  console.log(`  Monthly Equivalent: $${cost.monthlyCost.toFixed(2)}/month`);
  if (option.notes) console.log(`  Notes: ${option.notes}`);
});

console.log('\n\n╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                                  KEY INSIGHTS                                        ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

const currentOption = pricingOptions[0];
const r1ThroughputOption = pricingOptions[1];
const togetherV3Option = pricingOptions[2];
const deepInfraOption = pricingOptions[3];

const currentMonthlyCost = calculateCost(actualUsage, currentOption).monthlyCost;
const r1ThroughputMonthlyCost = calculateCost(actualUsage, r1ThroughputOption).monthlyCost;
const togetherV3MonthlyCost = calculateCost(actualUsage, togetherV3Option).monthlyCost;
const deepInfraMonthlyCost = calculateCost(actualUsage, deepInfraOption).monthlyCost;

const throughputSavings = currentMonthlyCost - r1ThroughputMonthlyCost;
const v3Savings = currentMonthlyCost - togetherV3MonthlyCost;
const deepInfraSavings = currentMonthlyCost - deepInfraMonthlyCost;

console.log('💡 YOUR ACTUAL SPENDING:');
console.log(`   Current model: DeepSeek R1 (reasoning model)`);
console.log(`   Current monthly cost: $${currentMonthlyCost.toFixed(2)}/month`);
console.log(`   Average: ${dailyRequests} requests/day`);
console.log('');

console.log('💰 POTENTIAL SAVINGS:');
console.log(`   Switch to R1 Throughput: Save $${throughputSavings.toFixed(2)}/mo (${((throughputSavings/currentMonthlyCost)*100).toFixed(1)}% reduction)`);
console.log(`   Switch to Together.ai V3.2: Save $${v3Savings.toFixed(2)}/mo (${((v3Savings/currentMonthlyCost)*100).toFixed(1)}% reduction)`);
console.log(`   Switch to DeepInfra V3.2: Save $${deepInfraSavings.toFixed(2)}/mo (${((deepInfraSavings/currentMonthlyCost)*100).toFixed(1)}% reduction)`);
console.log('');

console.log('🎯 RECOMMENDATIONS:');
console.log('');
console.log('   1. If you NEED reasoning (R1 model):');
console.log(`      → Switch to R1 Throughput: $${r1ThroughputMonthlyCost.toFixed(2)}/mo (save $${throughputSavings.toFixed(2)}/mo)`);
console.log('');
console.log('   2. If standard model is sufficient (V3.2):');
console.log(`      → Stay on Together.ai V3.2: $${togetherV3MonthlyCost.toFixed(2)}/mo (save $${v3Savings.toFixed(2)}/mo)`);
console.log(`      → Switch to DeepInfra V3.2: $${deepInfraMonthlyCost.toFixed(2)}/mo (save $${deepInfraSavings.toFixed(2)}/mo) - CHEAPEST`);
console.log('');

const inputOutputRatio = actualUsage.inputTokens / actualUsage.outputTokens;
console.log('📊 USAGE PATTERN ANALYSIS:');
console.log(`   Input/Output ratio: ${inputOutputRatio.toFixed(1)}:1`);
console.log(`   Very high input ratio - suggests large context windows or RAG usage`);
console.log(`   Average input per request: ${avgInputPerRequest.toLocaleString()} tokens`);
console.log(`   This is VERY high - likely using extensive context or conversation history`);
console.log('');

console.log('⚠️  IMPORTANT CONSIDERATIONS:');
console.log('   • R1 is a reasoning model - only use if you need chain-of-thought');
console.log('   • Your avg input is ~15.5k tokens/request - consider reducing context');
console.log('   • Input costs dominate (96% of total) - optimize context window');
console.log('   • DeepInfra doesn\'t offer R1, only V3.2');
console.log('   • Test V3.2 performance before switching from R1');
console.log('');

export { actualUsage, pricingOptions, calculateCost };
