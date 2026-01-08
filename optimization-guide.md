# Cost Optimization Guide: Caching & Smart Context Pruning

## Your Current Situation
- **Current cost**: $1,025/month on Together.ai DeepSeek R1
- **Average input per request**: 15,546 tokens (96% of your costs!)
- **Issue**: Sending massive context with every request

## Potential Savings
- **Switch to DeepInfra V3.2**: $86/month (save $939/mo)
- **Add smart context pruning**: Additional 40-60% savings
- **Implement caching**: Additional 50-80% savings on repeated content
- **Total potential**: **~$30-40/month** (97% reduction!)

---

## 1. Prompt Caching

### What is Prompt Caching?

Prompt caching allows you to cache frequently-used portions of your prompts (like system messages, document context, or conversation history) so you don't pay full price to reprocess them on every request.

**Cost reduction**: 10x cheaper for cached tokens (90% savings)

### Caching Support by Provider

| Provider | Model | Caching Type | Cost Reduction |
|----------|-------|--------------|----------------|
| **OpenAI** | GPT-4o, GPT-4o-mini | Automatic (>1024 tokens) | 50% discount |
| **Anthropic** | Claude (via DeepInfra) | Manual with `cache_control` | 90% discount |
| **DeepInfra** | DeepSeek V3.2 | Automatic (server-side)* | Unknown† |
| **Together.ai** | Most models | Automatic (server-side)* | Unknown† |

*Server-side caching is automatic but you don't get explicit cost discounts in billing
†Some providers use automatic prefix caching without exposing it to users

### Implementation Strategies

#### Strategy 1: Application-Level Caching (Works with any provider)

Cache responses locally to avoid making the same API call twice:

```typescript
// Simple in-memory cache
const responseCache = new Map<string, any>();

function getCacheKey(messages: any[]): string {
  // Create hash of messages for cache key
  return JSON.stringify(messages);
}

async function callLLMWithCache(messages: any[]) {
  const cacheKey = getCacheKey(messages);

  // Check cache
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 300000) { // 5 min TTL
    console.log('Cache hit!');
    return cached.response;
  }

  // Cache miss - make API call
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { /* ... */ },
    body: JSON.stringify({ model, messages })
  });

  const data = await response.json();

  // Store in cache
  responseCache.set(cacheKey, {
    response: data,
    timestamp: Date.now()
  });

  return data;
}
```

#### Strategy 2: Semantic Caching (More sophisticated)

Use embeddings to detect similar queries:

```typescript
// Requires embedding model (e.g., Nomic embedder you already have!)
async function semanticCacheKey(query: string): Promise<string> {
  const embedding = await embedder.embed(query);
  // Find similar cached queries
  const similar = await vectorStore.findSimilar(embedding, threshold: 0.95);
  return similar ? similar.cacheKey : generateNewKey(query);
}
```

#### Strategy 3: Structured Prompt Caching

Separate static vs dynamic content:

```typescript
interface CachedPrompt {
  systemPrompt: string;      // Rarely changes - cache this!
  documentContext: string;    // Changes per user - cache per user
  conversationHistory: any[]; // Changes frequently - don't cache
  userQuery: string;          // Always new
}

// Only send what changed
function buildOptimizedMessages(prompt: CachedPrompt) {
  return [
    { role: 'system', content: prompt.systemPrompt }, // Cacheable
    { role: 'system', content: prompt.documentContext }, // Cacheable per user
    ...prompt.conversationHistory.slice(-3), // Last 3 messages only!
    { role: 'user', content: prompt.userQuery }
  ];
}
```

---

## 2. Smart Context Pruning

### The Problem

Your current system sends **15,546 input tokens per request**. For a 16k context window, you're likely sending:
- System prompt: ~500 tokens
- Document context (RAG): ~5,000-8,000 tokens
- **Conversation history: ~7,000-10,000 tokens** ← THIS IS THE PROBLEM

### Solution: Intelligent History Management

#### Strategy 1: Sliding Window (Simplest)

Only keep the last N messages:

```typescript
function pruneConversationHistory(messages: any[], maxMessages: number = 6) {
  // Keep system message + last N messages
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  return [
    ...systemMessages,
    ...conversationMessages.slice(-maxMessages) // Last 6 messages = 3 turns
  ];
}
```

**Savings**: ~50-70% reduction in input tokens

#### Strategy 2: Token-Based Pruning (Better)

Keep messages until you hit a token budget:

```typescript
function pruneByTokenLimit(messages: any[], maxTokens: number = 4000) {
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  let tokenCount = 0;
  const prunedMessages = [];

  // Add from most recent backwards
  for (let i = conversationMessages.length - 1; i >= 0; i--) {
    const msg = conversationMessages[i];
    const msgTokens = estimateTokens(msg.content); // ~4 chars = 1 token

    if (tokenCount + msgTokens > maxTokens) break;

    prunedMessages.unshift(msg);
    tokenCount += msgTokens;
  }

  return [...systemMessages, ...prunedMessages];
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4); // Rough estimate
}
```

**Savings**: 60-80% reduction in input tokens

#### Strategy 3: Semantic Compression (Best)

Use your RAG system to summarize or select relevant history:

```typescript
async function intelligentContextPruning(
  messages: any[],
  currentQuery: string,
  maxTokens: number = 4000
) {
  // 1. Identify relevant past messages using embeddings
  const messageEmbeddings = await Promise.all(
    messages.map(m => embedder.embed(m.content))
  );
  const queryEmbedding = await embedder.embed(currentQuery);

  // 2. Rank by relevance to current query
  const rankedMessages = messages
    .map((msg, idx) => ({
      msg,
      score: cosineSimilarity(queryEmbedding, messageEmbeddings[idx])
    }))
    .sort((a, b) => b.score - a.score);

  // 3. Take top K relevant + most recent
  const relevant = rankedMessages.slice(0, 3).map(r => r.msg);
  const recent = messages.slice(-2);

  // 4. Combine and deduplicate
  const combined = [...new Set([...relevant, ...recent])];

  return pruneByTokenLimit(combined, maxTokens);
}
```

**Savings**: 70-90% reduction while maintaining quality

---

## 3. RAG Context Optimization

You're likely sending too much document context too.

### Strategy 1: Reduce Retrieved Chunks

```typescript
// In your /ragchat endpoint (index.ts:148)
// BEFORE:
const results = await ragger.query(queryString, documentIds);

// AFTER: Limit chunks
const results = await ragger.query(queryString, documentIds, {
  limit: 3 // Only top 3 chunks instead of default 5-10
});
```

**Savings**: 40-60% reduction in RAG context

### Strategy 2: Chunk Reranking

```typescript
async function rerankChunks(chunks: any[], query: string, topK: number = 3) {
  // Score each chunk by relevance
  const scored = await Promise.all(
    chunks.map(async chunk => ({
      chunk,
      score: await calculateRelevance(chunk.content, query)
    }))
  );

  // Return only top K
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(s => s.chunk);
}
```

### Strategy 3: Chunk Summarization

For very long chunks, summarize them:

```typescript
function summarizeChunk(chunk: string, maxTokens: number = 200): string {
  const tokens = estimateTokens(chunk);

  if (tokens <= maxTokens) return chunk;

  // Simple extraction - take first and last sentences
  const sentences = chunk.split(/[.!?]+/);
  if (sentences.length <= 3) {
    return chunk.substring(0, maxTokens * 4); // Truncate
  }

  return sentences[0] + '... ' + sentences[sentences.length - 1];
}
```

---

## 4. Migration to DeepInfra V3.2

### Update Your Code

```typescript
// In index.ts, update:

// OLD (Together.ai):
const API_KEY = process.env.TOGETHER_API_KEY;
const API_URL = "https://api.together.xyz/v1/chat/completions";
const DEFAULT_MODEL = "deepseek-ai/DeepSeek-R1";

// NEW (DeepInfra):
const API_KEY = process.env.DEEPINFRA_API_KEY;
const API_URL = "https://api.deepinfra.com/v1/openai/chat/completions";
const DEFAULT_MODEL = "deepseek-ai/DeepSeek-V3.2";
```

### Environment Variables

```bash
# Add to .env
DEEPINFRA_API_KEY=your_api_key_here
```

---

## 5. Complete Optimized Implementation

Here's how to combine everything:

```typescript
// optimized-chat-handler.ts
import { Request, Response } from 'express';

const MAX_HISTORY_TOKENS = 2000;  // Reduced from ~10,000
const MAX_RAG_CHUNKS = 3;         // Reduced from 5+
const ENABLE_RESPONSE_CACHE = true;

// Response cache
const responseCache = new Map<string, any>();

export async function optimizedRagChat(req: Request, res: Response) {
  const { messages, model } = req.body;

  // 1. Prune conversation history
  const prunedMessages = pruneByTokenLimit(messages, MAX_HISTORY_TOKENS);

  // 2. Get user query
  const userQuery = messages[messages.length - 1].content;

  // 3. Check cache first
  if (ENABLE_RESPONSE_CACHE) {
    const cacheKey = `${userQuery}_${JSON.stringify(documentIds)}`;
    const cached = responseCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 300000) {
      return res.json(cached.response);
    }
  }

  // 4. RAG with limited chunks
  const ragResults = await ragger.query(userQuery, documentIds);
  const topChunks = ragResults.slice(0, MAX_RAG_CHUNKS);

  // 5. Build optimized context
  const systemMessage = prunedMessages.find(m => m.role === 'system');
  const optimizedContext = {
    role: 'system',
    content: `${systemMessage?.content || ''}\n\nRelevant context:\n${
      topChunks.map(c => c.text).join('\n\n')
    }`
  };

  // 6. Build final message array
  const finalMessages = [
    optimizedContext,
    ...prunedMessages.filter(m => m.role !== 'system')
  ];

  // 7. Make API call
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: model || 'deepseek-ai/DeepSeek-V3.2',
      messages: finalMessages
    })
  });

  const data = await response.json();

  // 8. Cache response
  if (ENABLE_RESPONSE_CACHE) {
    const cacheKey = `${userQuery}_${JSON.stringify(documentIds)}`;
    responseCache.set(cacheKey, {
      response: data,
      timestamp: Date.now()
    });
  }

  res.json({ ...data, chunks: topChunks });
}

function pruneByTokenLimit(messages: any[], maxTokens: number) {
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
```

---

## Expected Cost Savings

| Optimization | Current | After | Savings |
|--------------|---------|-------|---------|
| **Baseline (Together R1)** | $1,025/mo | - | - |
| Switch to DeepInfra V3.2 | $1,025/mo | $86/mo | -$939 (92%) |
| + Context pruning (50%) | - | $43/mo | -$982 (96%) |
| + RAG optimization (30%) | - | $30/mo | -$995 (97%) |
| + Response caching (20%) | - | **$24/mo** | **-$1,001 (97.7%)** |

---

## Implementation Checklist

- [ ] Get DeepInfra API key
- [ ] Update environment variables
- [ ] Change API endpoint and model in code
- [ ] Implement context pruning (start with sliding window)
- [ ] Reduce RAG chunks from 5+ to 3
- [ ] Add response caching (in-memory or Redis)
- [ ] Test quality with smaller context
- [ ] Monitor token usage in first week
- [ ] Iterate based on user feedback

---

## Monitoring & Iteration

```typescript
// Add logging to track improvements
console.log({
  endpoint: '/ragchat',
  inputTokens: estimateTokens(JSON.stringify(finalMessages)),
  outputTokens: data.usage?.completion_tokens,
  cacheHit: wasCacheHit,
  estimatedCost: calculateCost(inputTokens, outputTokens)
});
```

Track these metrics:
- Average tokens per request (target: <4,000)
- Cache hit rate (target: >20%)
- Response quality (user satisfaction)
- Monthly cost trend

---

## Resources

- [OpenAI Prompt Caching Guide](https://platform.openai.com/docs/guides/prompt-caching)
- [Anthropic Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [DeepInfra Documentation](https://deepinfra.com/docs)
- [LLM Caching Strategies](https://costlens.dev/blog/llm-caching-strategies)
