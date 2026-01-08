/**
 * DeepInfra Chatbot Cost Calculator
 * Model: DeepSeek V3.2
 *
 * Based on pricing research from DeepInfra and third-party aggregators (January 2026)
 *
 * Pricing (per million tokens):
 * - Input: $0.26 - $0.85 (using $0.26 for V3.2 based on OpenRouter data)
 * - Output: $0.39 - $0.90 (using $0.39 for V3.2 based on OpenRouter data)
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

class ChatbotCostCalculator {
  // DeepInfra DeepSeek V3.2 pricing (per million tokens)
  private readonly INPUT_PRICE_PER_M = 0.26; // $0.26 per 1M input tokens
  private readonly OUTPUT_PRICE_PER_M = 0.39; // $0.39 per 1M output tokens

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
    // Note: Context window affects how much history is sent with each request
    // We'll estimate that each message includes partial context
    const avgContextUsedPerMessage = Math.min(contextWindow * 0.5, 8000); // Estimate 50% of context or 8k max

    const inputTokensPerMonth = totalMessagesPerMonth * (avgInputTokensPerMessage + avgContextUsedPerMessage);
    const outputTokensPerMonth = totalMessagesPerMonth * avgOutputTokensPerMessage;
    const totalTokensPerMonth = inputTokensPerMonth + outputTokensPerMonth;

    // Calculate costs
    const inputCost = (inputTokensPerMonth / 1_000_000) * this.INPUT_PRICE_PER_M;
    const outputCost = (outputTokensPerMonth / 1_000_000) * this.OUTPUT_PRICE_PER_M;
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
    console.log('\n=== DEEPINFRA DEEPSEEK V3.2 CHATBOT COST CALCULATOR ===\n');

    console.log('Configuration:');
    console.log(`  Users: ${scenario.users}`);
    console.log(`  Context Window: ${scenario.contextWindow.toLocaleString()} tokens`);
    console.log(`  Messages per user per day: ${scenario.messagesPerUserPerDay}`);
    console.log(`  Avg input tokens per message: ${scenario.avgInputTokensPerMessage}`);
    console.log(`  Avg output tokens per message: ${scenario.avgOutputTokensPerMessage}`);
    console.log(`  Days per month: ${scenario.daysPerMonth}`);

    console.log('\nPricing (DeepInfra):');
    console.log(`  Input: $${this.INPUT_PRICE_PER_M} per 1M tokens`);
    console.log(`  Output: $${this.OUTPUT_PRICE_PER_M} per 1M tokens`);

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

// Example scenarios
const calculator = new ChatbotCostCalculator();

// Your scenario: 100 users, 16k context window
const yourScenario: UsageScenario = {
  users: 100,
  contextWindow: 16_000,
  messagesPerUserPerDay: 10, // Conservative estimate
  avgInputTokensPerMessage: 100, // ~25 words per message
  avgOutputTokensPerMessage: 200, // ~50 words response
  daysPerMonth: 30,
};

const lowUsageScenario: UsageScenario = {
  users: 100,
  contextWindow: 16_000,
  messagesPerUserPerDay: 5, // Light usage
  avgInputTokensPerMessage: 50,
  avgOutputTokensPerMessage: 150,
  daysPerMonth: 30,
};

const highUsageScenario: UsageScenario = {
  users: 100,
  contextWindow: 16_000,
  messagesPerUserPerDay: 20, // Heavy usage
  avgInputTokensPerMessage: 150,
  avgOutputTokensPerMessage: 300,
  daysPerMonth: 30,
};

// Calculate and print costs
console.log('LOW USAGE SCENARIO');
calculator.printCostBreakdown(lowUsageScenario, calculator.calculateMonthlyCost(lowUsageScenario));

console.log('\nMEDIUM USAGE SCENARIO (YOUR ESTIMATE)');
calculator.printCostBreakdown(yourScenario, calculator.calculateMonthlyCost(yourScenario));

console.log('\nHIGH USAGE SCENARIO');
calculator.printCostBreakdown(highUsageScenario, calculator.calculateMonthlyCost(highUsageScenario));

// Export for use in other files
export { ChatbotCostCalculator, UsageScenario, CostBreakdown };
