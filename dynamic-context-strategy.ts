/**
 * Dynamic Context Window Strategy
 *
 * Intelligently adjust context size based on conversation needs
 * Balance cost savings with user experience
 */

interface ConversationMetadata {
  userId: string;
  conversationId: string;
  messageCount: number;
  topics: string[];
  requiresLongContext: boolean;
}

interface ContextStrategy {
  name: string;
  maxTokens: number;
  description: string;
  costMultiplier: number;
}

// Different context strategies
const CONTEXT_STRATEGIES: Record<string, ContextStrategy> = {
  minimal: {
    name: 'Minimal',
    maxTokens: 1000,
    description: 'Quick Q&A, no history needed',
    costMultiplier: 0.1
  },
  standard: {
    name: 'Standard',
    maxTokens: 2000,
    description: 'Normal conversation, last few messages',
    costMultiplier: 0.3
  },
  extended: {
    name: 'Extended',
    maxTokens: 4000,
    description: 'Multi-turn discussion, needs more context',
    costMultiplier: 0.5
  },
  full: {
    name: 'Full',
    maxTokens: 8000,
    description: 'Complex analysis, requires full history',
    costMultiplier: 1.0
  },
  maximum: {
    name: 'Maximum',
    maxTokens: 16000,
    description: 'Document analysis, legal review, etc.',
    costMultiplier: 2.0
  }
};

/**
 * Strategy 1: Detect conversation type automatically
 */
function detectContextNeeds(messages: any[]): ContextStrategy {
  const lastMessage = messages[messages.length - 1]?.content || '';
  const messageCount = messages.filter(m => m.role !== 'system').length;

  // Signals that suggest need for more context
  const needsMoreContext = [
    /what did (i|we) (say|talk about|discuss)/i,
    /earlier (you|i) (said|mentioned)/i,
    /going back to/i,
    /as (i|we) discussed/i,
    /remember when/i,
    /like (i|we) said before/i,
    /referring to/i,
    /you mentioned/i,
  ];

  const needsFullContext = [
    /analyze (the|this|all)/i,
    /summarize (everything|all|the conversation)/i,
    /compare.*with earlier/i,
    /throughout (this|our) (conversation|discussion)/i,
  ];

  // Check for context reference signals
  const needsExtended = needsMoreContext.some(pattern => pattern.test(lastMessage));
  const needsFull = needsFullContext.some(pattern => pattern.test(lastMessage));

  // Decision tree
  if (needsFull) {
    return CONTEXT_STRATEGIES.full;
  } else if (needsExtended || messageCount > 10) {
    return CONTEXT_STRATEGIES.extended;
  } else if (messageCount > 5) {
    return CONTEXT_STRATEGIES.standard;
  } else {
    return CONTEXT_STRATEGIES.minimal;
  }
}

/**
 * Strategy 2: Let users choose their context preference
 */
interface UserContextPreference {
  userId: string;
  preferredStrategy: keyof typeof CONTEXT_STRATEGIES;
  maxMonthlyBudget?: number; // Optional spending limit
}

const userPreferences = new Map<string, UserContextPreference>();

function getUserContextStrategy(userId: string): ContextStrategy {
  const pref = userPreferences.get(userId);
  if (!pref) return CONTEXT_STRATEGIES.standard; // Default

  return CONTEXT_STRATEGIES[pref.preferredStrategy];
}

/**
 * Strategy 3: Hybrid - Smart Pruning with Long Context
 *
 * Instead of removing old messages, intelligently compress them
 */
function intelligentContextCompression(
  messages: any[],
  targetTokens: number
): any[] {
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  if (conversationMessages.length <= 4) {
    // Short conversation - no compression needed
    return messages;
  }

  // Strategy: Keep recent messages full, compress older ones
  const recentMessages = conversationMessages.slice(-4); // Last 2 turns
  const olderMessages = conversationMessages.slice(0, -4);

  // Compress older messages into a summary
  const compressedHistory = compressOlderMessages(olderMessages);

  return [
    ...systemMessages,
    compressedHistory,
    ...recentMessages
  ];
}

function compressOlderMessages(messages: any[]): any {
  // Create a concise summary of older messages
  const summary = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${
      m.content.length > 100 ? m.content.substring(0, 100) + '...' : m.content
    }`)
    .join('\n');

  return {
    role: 'system',
    content: `Previous conversation summary:\n${summary}`
  };
}

/**
 * Strategy 4: Topic-Based Context Windows
 *
 * Only include messages relevant to the current topic
 */
async function topicBasedPruning(
  messages: any[],
  currentQuery: string,
  embedder: any
): Promise<any[]> {
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  if (conversationMessages.length <= 6) {
    return messages; // Keep all if short
  }

  // Always keep last 2 turns
  const recentMessages = conversationMessages.slice(-4);
  const olderMessages = conversationMessages.slice(0, -4);

  // Embed current query
  const queryEmbedding = await embedder.embed(currentQuery);

  // Find most relevant older messages
  const scoredMessages = await Promise.all(
    olderMessages.map(async (msg) => {
      const msgEmbedding = await embedder.embed(msg.content);
      const relevance = cosineSimilarity(queryEmbedding, msgEmbedding);
      return { msg, relevance };
    })
  );

  // Take top 3 relevant older messages
  const relevantOlder = scoredMessages
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 3)
    .map(s => s.msg);

  return [
    ...systemMessages,
    ...relevantOlder,
    ...recentMessages
  ];
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magA * magB);
}

/**
 * Strategy 5: Sliding Window with Summaries
 *
 * Maintain a running summary of conversation history
 */
class ConversationContextManager {
  private conversationSummary: string = '';
  private recentMessages: any[] = [];
  private maxRecentMessages = 6;

  async addMessage(message: any, llmClient?: any) {
    this.recentMessages.push(message);

    // If we have too many recent messages, summarize the oldest and compress
    if (this.recentMessages.length > this.maxRecentMessages) {
      const toSummarize = this.recentMessages.slice(0, 2);
      this.recentMessages = this.recentMessages.slice(2);

      // Optional: Use LLM to create better summary
      if (llmClient && toSummarize.length > 0) {
        const newSummary = await this.createSummary(toSummarize, llmClient);
        this.conversationSummary += '\n' + newSummary;
      }
    }
  }

  getContextMessages(systemPrompt: string): any[] {
    const messages = [];

    // Add system prompt
    messages.push({
      role: 'system',
      content: systemPrompt
    });

    // Add conversation summary if exists
    if (this.conversationSummary) {
      messages.push({
        role: 'system',
        content: `Previous conversation summary:\n${this.conversationSummary}`
      });
    }

    // Add recent messages
    messages.push(...this.recentMessages);

    return messages;
  }

  private async createSummary(messages: any[], llmClient: any): Promise<string> {
    // Use a cheap, fast model to create summary
    const summaryPrompt = `Summarize these messages concisely in 1-2 sentences:\n${
      messages.map(m => `${m.role}: ${m.content}`).join('\n')
    }`;

    const response = await llmClient.summarize(summaryPrompt);
    return response;
  }
}

/**
 * Main adaptive context function
 */
export async function buildAdaptiveContext(
  messages: any[],
  options: {
    userId?: string;
    embedder?: any;
    mode?: 'auto' | 'user-pref' | 'compression' | 'topic-based';
    maxTokens?: number;
  }
): Promise<any[]> {
  const { userId, embedder, mode = 'auto', maxTokens } = options;

  // Mode: User preference
  if (mode === 'user-pref' && userId) {
    const strategy = getUserContextStrategy(userId);
    return pruneByTokenLimit(messages, strategy.maxTokens);
  }

  // Mode: Topic-based (requires embedder)
  if (mode === 'topic-based' && embedder) {
    const lastMessage = messages[messages.length - 1]?.content || '';
    return await topicBasedPruning(messages, lastMessage, embedder);
  }

  // Mode: Compression
  if (mode === 'compression') {
    const targetTokens = maxTokens || 4000;
    return intelligentContextCompression(messages, targetTokens);
  }

  // Mode: Auto-detect (default)
  const strategy = detectContextNeeds(messages);
  console.log(`Auto-detected context strategy: ${strategy.name} (${strategy.maxTokens} tokens)`);
  return pruneByTokenLimit(messages, strategy.maxTokens);
}

function pruneByTokenLimit(messages: any[], maxTokens: number): any[] {
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  let tokenCount = 0;
  const prunedMessages = [];

  for (let i = conversationMessages.length - 1; i >= 0; i--) {
    const msg = conversationMessages[i];
    const msgTokens = Math.ceil(msg.content.length / 4);

    if (tokenCount + msgTokens > maxTokens) break;

    prunedMessages.unshift(msg);
    tokenCount += msgTokens;
  }

  return [...systemMessages, ...prunedMessages];
}

/**
 * Cost estimation for different strategies
 */
export function estimateCostByStrategy(
  requestsPerDay: number,
  strategy: ContextStrategy,
  daysPerMonth: number = 30
): { monthlyCost: number; costPerRequest: number } {
  const inputPricePerM = 0.26; // DeepInfra V3.2
  const outputPricePerM = 0.39;

  const avgOutputTokens = 581; // From your actual data
  const avgInputTokens = strategy.maxTokens + 1000; // Context + user message + RAG

  const requestsPerMonth = requestsPerDay * daysPerMonth;
  const inputTokensPerMonth = requestsPerMonth * avgInputTokens;
  const outputTokensPerMonth = requestsPerMonth * avgOutputTokens;

  const inputCost = (inputTokensPerMonth / 1_000_000) * inputPricePerM;
  const outputCost = (outputTokensPerMonth / 1_000_000) * outputPricePerM;
  const monthlyCost = inputCost + outputCost;

  return {
    monthlyCost,
    costPerRequest: monthlyCost / requestsPerMonth
  };
}

// Example: Show costs for each strategy
console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║         COST BY CONTEXT STRATEGY (674 requests/day)             ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

console.log('Strategy      │ Max Tokens │ Monthly Cost │ Cost/Request │ Use Case');
console.log('──────────────┼────────────┼──────────────┼──────────────┼─────────────────────');

Object.entries(CONTEXT_STRATEGIES).forEach(([key, strategy]) => {
  const cost = estimateCostByStrategy(674, strategy);
  const name = strategy.name.padEnd(14);
  const tokens = strategy.maxTokens.toString().padStart(10);
  const monthly = `$${cost.monthlyCost.toFixed(2)}`.padStart(12);
  const perReq = `$${cost.costPerRequest.toFixed(6)}`.padStart(12);

  console.log(`${name}│ ${tokens} │ ${monthly} │ ${perReq} │ ${strategy.description}`);
});

console.log('\n💡 RECOMMENDATIONS:\n');
console.log('1. AUTO-DETECT: Use 80-90% minimal/standard, 10-20% extended/full');
console.log('   → Average cost: ~$30-50/month\n');
console.log('2. USER CHOICE: Let users select "High quality" vs "Fast & cheap"');
console.log('   → Power users pay more, casual users pay less\n');
console.log('3. HYBRID: Start with standard, upgrade to extended when needed');
console.log('   → Smart compromise between cost and quality\n');
console.log('4. COMPRESSION: Always compress old messages, keep recent full');
console.log('   → Best of both worlds - long context at lower cost\n');

export {
  CONTEXT_STRATEGIES,
  detectContextNeeds,
  intelligentContextCompression,
  topicBasedPruning,
  ConversationContextManager
};
