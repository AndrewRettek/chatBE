/**
 * Together.ai Chatbot Cost Calculator
 * Models: DeepSeek V3, V3.1, V3.2, R1
 *
 * Based on pricing research from Together.ai (January 2026)
 *
 * Pricing (per million tokens):
 * DeepSeek V3/V3.1/V3.2:
 * - Input: $0.60 per 1M tokens
 * - Output: $1.70 per 1M tokens
 *
 * DeepSeek R1 (reasoning model):
 * - Input: $3.00 per 1M tokens
 * - Output: $7.00 per 1M tokens
 *
 * DeepSeek R1 Throughput (optimized):
 * - Input: $0.55 per 1M tokens
 * - Output: $2.19 per 1M tokens
 */

interface UsageScenario {
  users: number;
  contextWindow: number;
  messagesPerUserPerDay: number;
  avgInputTokensPerMessage: number;
  avgOutputTokensPerMessage: number;
  daysPerMonth: number;
}

interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  perUserCost: number;
}

class TogetherAICostCalculator {
  constructor(
    private inputPricePerM: number,
    private outputPricePerM: number,
    private modelName: string
  ) {}

  calculateMonthlyCost(scenario: UsageScenario): CostBreakdown {
    const {
      users,
      contextWindow,
      messagesPerUserPerDay,
      avgInputTokensPerMessage,
      avgOutputTokensPerMessage,
      daysPerMonth,
    } = scenario;

    // Calculate total messages per month
    const totalMessagesPerMonth = users * messagesPerUserPerDay * daysPerMonth;

    // Calculate token usage
    // Context window affects how much history is sent with each request
    const avgContextUsedPerMessage = Math.min(contextWindow * 0.5, 8000);

    const inputTokensPerMonth = totalMessagesPerMonth * (avgInputTokensPerMessage + avgContextUsedPerMessage);
    const outputTokensPerMonth = totalMessagesPerMonth * avgOutputTokensPerMessage;
    const totalTokensPerMonth = inputTokensPerMonth + outputTokensPerMonth;

    // Calculate costs
    const inputCost = (inputTokensPerMonth / 1_000_000) * this.inputPricePerM;
    const outputCost = (outputTokensPerMonth / 1_000_000) * this.outputPricePerM;
    const totalCost = inputCost + outputCost;

    return {
      inputTokens: inputTokensPerMonth,
      outputTokens: outputTokensPerMonth,
      totalTokens: totalTokensPerMonth,
      inputCost,
      outputCost,
      totalCost,
      perUserCost: totalCost / users,
    };
  }

  printCostBreakdown(scenario: UsageScenario, breakdown: CostBreakdown) {
    console.log(`\n=== TOGETHER.AI ${this.modelName.toUpperCase()} COST CALCULATOR ===\n`);

    console.log('Configuration:');
    console.log(`  Users: ${scenario.users}`);
    console.log(`  Context Window: ${scenario.contextWindow.toLocaleString()} tokens`);
    console.log(`  Messages per user per day: ${scenario.messagesPerUserPerDay}`);
    console.log(`  Avg input tokens per message: ${scenario.avgInputTokensPerMessage}`);
    console.log(`  Avg output tokens per message: ${scenario.avgOutputTokensPerMessage}`);
    console.log(`  Days per month: ${scenario.daysPerMonth}`);

    console.log('\nPricing (Together.ai):');
    console.log(`  Input: $${this.inputPricePerM} per 1M tokens`);
    console.log(`  Output: $${this.outputPricePerM} per 1M tokens`);

    console.log('\nMonthly Token Usage:');
    console.log(`  Input tokens: ${breakdown.inputTokens.toLocaleString()}`);
    console.log(`  Output tokens: ${breakdown.outputTokens.toLocaleString()}`);
    console.log(`  Total tokens: ${breakdown.totalTokens.toLocaleString()}`);

    console.log('\nMonthly Costs:');
    console.log(`  Input cost: $${breakdown.inputCost.toFixed(2)}`);
    console.log(`  Output cost: $${breakdown.outputCost.toFixed(2)}`);
    console.log(`  TOTAL: $${breakdown.totalCost.toFixed(2)}`);
    console.log(`  Per user: $${breakdown.perUserCost.toFixed(4)}`);

    console.log('\n======================================================\n');
  }
}

// Model configurations
const models = {
  deepseekV3: new TogetherAICostCalculator(0.60, 1.70, 'DeepSeek V3/V3.2'),
  deepseekR1: new TogetherAICostCalculator(3.00, 7.00, 'DeepSeek R1'),
  deepseekR1Throughput: new TogetherAICostCalculator(0.55, 2.19, 'DeepSeek R1 Throughput'),
};

// Usage scenarios
const scenarios = {
  low: {
    users: 100,
    contextWindow: 16_000,
    messagesPerUserPerDay: 5,
    avgInputTokensPerMessage: 50,
    avgOutputTokensPerMessage: 150,
    daysPerMonth: 30,
  },
  medium: {
    users: 100,
    contextWindow: 16_000,
    messagesPerUserPerDay: 10,
    avgInputTokensPerMessage: 100,
    avgOutputTokensPerMessage: 200,
    daysPerMonth: 30,
  },
  high: {
    users: 100,
    contextWindow: 16_000,
    messagesPerUserPerDay: 20,
    avgInputTokensPerMessage: 150,
    avgOutputTokensPerMessage: 300,
    daysPerMonth: 30,
  },
};

// Calculate costs for each model and scenario
console.log('╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    TOGETHER.AI CHATBOT COST COMPARISON (100 USERS)                   ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

Object.entries(models).forEach(([modelKey, calculator]) => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ${calculator['modelName']}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  Object.entries(scenarios).forEach(([scenarioName, scenario]) => {
    const breakdown = calculator.calculateMonthlyCost(scenario);
    console.log(`\n${scenarioName.toUpperCase()} USAGE (${scenario.messagesPerUserPerDay} msgs/user/day):`);
    console.log(`  Monthly cost: $${breakdown.totalCost.toFixed(2)}`);
    console.log(`  Cost per user: $${breakdown.perUserCost.toFixed(2)}`);
    console.log(`  Input: $${breakdown.inputCost.toFixed(2)} | Output: $${breakdown.outputCost.toFixed(2)}`);
  });
  console.log('');
});

// Create comparison table across user counts
console.log('\n╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                     COST SCALING BY USER COUNT (MEDIUM USAGE)                       ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

const userCounts = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

console.log('═══════════════════════════════════════════════════════════════════════════════════════');
console.log('Model             │  100  │  200  │  300  │  400  │  500  │  600  │  700  │  800  │  900  │ 1000 ');
console.log('──────────────────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────');

Object.entries(models).forEach(([modelKey, calculator]) => {
  const costs = userCounts.map(users => {
    const scenario = { ...scenarios.medium, users };
    const breakdown = calculator.calculateMonthlyCost(scenario);
    return breakdown.totalCost;
  });

  const label = calculator['modelName'].padEnd(18);
  const costStrings = costs.map(cost => `$${Math.round(cost)}`.padStart(5));

  console.log(`${label}│ ${costStrings.join(' │ ')}`);
});

console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

// Provider comparison
console.log('\n╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║              TOGETHER.AI vs DEEPINFRA COMPARISON (100 USERS, MEDIUM USAGE)          ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

const togetherV3Cost = models.deepseekV3.calculateMonthlyCost(scenarios.medium);
const togetherR1ThroughputCost = models.deepseekR1Throughput.calculateMonthlyCost(scenarios.medium);
const deepInfraCost = 65.52; // From previous calculation

console.log('Provider & Model                        │ Monthly Cost │ Cost/User │ vs DeepInfra');
console.log('────────────────────────────────────────┼──────────────┼───────────┼─────────────');
console.log(`DeepInfra DeepSeek V3.2                 │ $${deepInfraCost.toFixed(2).padStart(10)} │ $${(deepInfraCost/100).toFixed(4).padStart(8)} │ Baseline`);
console.log(`Together.ai DeepSeek V3.2               │ $${togetherV3Cost.totalCost.toFixed(2).padStart(10)} │ $${togetherV3Cost.perUserCost.toFixed(4).padStart(8)} │ ${((togetherV3Cost.totalCost/deepInfraCost - 1) * 100).toFixed(1)}% ${togetherV3Cost.totalCost > deepInfraCost ? 'more' : 'less'}`);
console.log(`Together.ai DeepSeek R1 Throughput     │ $${togetherR1ThroughputCost.totalCost.toFixed(2).padStart(10)} │ $${togetherR1ThroughputCost.perUserCost.toFixed(4).padStart(8)} │ ${((togetherR1ThroughputCost.totalCost/deepInfraCost - 1) * 100).toFixed(1)}% ${togetherR1ThroughputCost.totalCost > deepInfraCost ? 'more' : 'less'}`);

console.log('\n💡 KEY INSIGHTS:');
console.log('   • Together.ai DeepSeek V3.2 is ~2.3x more expensive than DeepInfra');
console.log('   • DeepInfra offers the best pricing for DeepSeek models');
console.log('   • R1 models are significantly more expensive (reasoning capabilities)');
console.log('   • Both providers are vastly cheaper than self-hosting for <300 users');
console.log('   • Consider DeepInfra if cost is primary concern');
console.log('   • Consider Together.ai for ecosystem/tooling preferences');
console.log('');

export { TogetherAICostCalculator, models, scenarios };
