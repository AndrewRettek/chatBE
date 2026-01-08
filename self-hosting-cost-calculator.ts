/**
 * Self-Hosting Cost Calculator for DeepSeek V3.2
 *
 * Hardware Requirements (4-bit quantization):
 * - ~370-400GB VRAM needed
 * - Minimum 5x H100 80GB or 5x A100 80GB GPUs
 * - Recommended: 8x H100/A100 for better performance and headroom
 *
 * Cloud Provider Pricing Research (January 2026):
 * - AWS: H100 ~$12.25/GPU-hr, A100 ~$4-5/GPU-hr
 * - GCP: H100 ~$3.00/GPU-hr, A100 ~$0.80-1.00/GPU-hr
 * - Azure: H100 ~$6.98/GPU-hr, A100 ~$3.67/GPU-hr
 * - RunPod: H100 ~$2.39-2.79/GPU-hr, A100 ~$1.64-1.74/GPU-hr
 * - Lambda Labs: H100 ~$2.49-2.99/GPU-hr, A100 ~$1.10/GPU-hr
 * - Vast.ai: H100 ~$0.90-1.87/GPU-hr, A100 ~$0.75/GPU-hr
 */

interface HostingOption {
  provider: string;
  gpuType: string;
  pricePerGpuHour: number;
  gpusNeeded: number;
  reliability: 'High' | 'Medium' | 'Low';
  notes?: string;
}

interface UserScaleConfig {
  users: number;
  instancesNeeded: number; // How many GPU clusters needed for this user count
  utilizationHoursPerDay: number; // Hours of actual usage per day
}

const HOSTING_OPTIONS: HostingOption[] = [
  // AWS
  { provider: 'AWS EC2', gpuType: 'H100 (8x)', pricePerGpuHour: 12.25, gpusNeeded: 8, reliability: 'High' },
  { provider: 'AWS EC2', gpuType: 'A100 (8x)', pricePerGpuHour: 4.00, gpusNeeded: 8, reliability: 'High' },

  // GCP
  { provider: 'GCP', gpuType: 'H100 (8x)', pricePerGpuHour: 3.00, gpusNeeded: 8, reliability: 'High' },
  { provider: 'GCP', gpuType: 'A100 (8x)', pricePerGpuHour: 0.90, gpusNeeded: 8, reliability: 'High' },

  // Azure
  { provider: 'Azure', gpuType: 'H100 (8x)', pricePerGpuHour: 6.98, gpusNeeded: 8, reliability: 'High' },
  { provider: 'Azure', gpuType: 'A100 (4x)', pricePerGpuHour: 3.67, gpusNeeded: 8, reliability: 'High', notes: 'Need 2 instances' },

  // RunPod
  { provider: 'RunPod', gpuType: 'H100 (8x)', pricePerGpuHour: 2.59, gpusNeeded: 8, reliability: 'Medium' },
  { provider: 'RunPod', gpuType: 'A100 (8x)', pricePerGpuHour: 1.69, gpusNeeded: 8, reliability: 'Medium' },

  // Lambda Labs
  { provider: 'Lambda Labs', gpuType: 'H100 (8x)', pricePerGpuHour: 2.74, gpusNeeded: 8, reliability: 'Medium', notes: 'Often out of stock' },
  { provider: 'Lambda Labs', gpuType: 'A100 (8x)', pricePerGpuHour: 1.10, gpusNeeded: 8, reliability: 'Medium', notes: 'Often out of stock' },

  // Vast.ai (marketplace, variable pricing)
  { provider: 'Vast.ai', gpuType: 'H100 (8x)', pricePerGpuHour: 1.40, gpusNeeded: 8, reliability: 'Low', notes: 'Marketplace pricing, variable availability' },
  { provider: 'Vast.ai', gpuType: 'A100 (8x)', pricePerGpuHour: 0.75, gpusNeeded: 8, reliability: 'Low', notes: 'Marketplace pricing, variable availability' },
];

// Calculate how many instances needed based on user count
// Assumes: 10 msgs/user/day, 3 second inference time, 3x peak load factor
function calculateInstancesNeeded(users: number): { instances: number; hoursPerDay: number } {
  const messagesPerDay = users * 10;
  const inferenceTimeSeconds = 3;
  const peakLoadFactor = 3;

  // Peak concurrent requests
  const peakConcurrentRequests = (messagesPerDay / (24 * 3600)) * inferenceTimeSeconds * peakLoadFactor;

  // Each 8-GPU instance can handle ~10 concurrent requests (estimated)
  const concurrentCapacityPerInstance = 10;
  const instancesNeeded = Math.ceil(peakConcurrentRequests / concurrentCapacityPerInstance);

  // Calculate actual utilization hours per day
  // Assume instance needs to be up for peak hours (8-12 hours/day for medium load)
  // Or 24/7 for high user counts
  let hoursPerDay: number;
  if (users <= 200) {
    hoursPerDay = 12; // Part-time for small user base
  } else if (users <= 500) {
    hoursPerDay = 18; // Extended hours
  } else {
    hoursPerDay = 24; // 24/7 for large user base
  }

  return {
    instances: Math.max(1, instancesNeeded),
    hoursPerDay
  };
}

function calculateMonthlyCost(
  option: HostingOption,
  users: number
): { monthlyCost: number; costPerUser: number; instancesUsed: number; hoursPerDay: number } {
  const { instances, hoursPerDay } = calculateInstancesNeeded(users);

  const hourlyRate = option.pricePerGpuHour * option.gpusNeeded;
  const dailyCost = hourlyRate * hoursPerDay * instances;
  const monthlyCost = dailyCost * 30;

  return {
    monthlyCost,
    costPerUser: monthlyCost / users,
    instancesUsed: instances,
    hoursPerDay
  };
}

// Generate comparison table
console.log('╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║          SELF-HOSTING COST COMPARISON: DeepSeek V3.2 (4-bit Quantization)           ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

console.log('Hardware Requirements: 8x H100/A100 GPUs minimum (~400GB VRAM)\n');

// Create table for each user count
const userCounts = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

// For each hosting option, create a row showing costs across user counts
console.log('═══════════════════════════════════════════════════════════════════════════════════════');
console.log('Provider/GPU      │  100   │  200   │  300   │  400   │  500   │  600   │  700   │  800   │  900   │ 1000  ');
console.log('──────────────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────');

for (const option of HOSTING_OPTIONS) {
  const costs = userCounts.map(users => {
    const { monthlyCost } = calculateMonthlyCost(option, users);
    return monthlyCost;
  });

  const label = `${option.provider} ${option.gpuType}`.padEnd(18);
  const costStrings = costs.map(cost => `$${Math.round(cost).toLocaleString()}`.padStart(6));

  console.log(`${label}│ ${costStrings.join(' │ ')}`);
}

console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

// Cost per user breakdown
console.log('\n═══════════════════════════════════════════════════════════════════════════════════════');
console.log('COST PER USER (Monthly)');
console.log('═══════════════════════════════════════════════════════════════════════════════════════');
console.log('Provider/GPU      │  100   │  200   │  300   │  400   │  500   │  600   │  700   │  800   │  900   │ 1000  ');
console.log('──────────────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────');

for (const option of HOSTING_OPTIONS) {
  const costsPerUser = userCounts.map(users => {
    const { costPerUser } = calculateMonthlyCost(option, users);
    return costPerUser;
  });

  const label = `${option.provider} ${option.gpuType}`.padEnd(18);
  const costStrings = costsPerUser.map(cost => `$${cost.toFixed(2)}`.padStart(6));

  console.log(`${label}│ ${costStrings.join(' │ ')}`);
}

console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

// Detailed breakdown for 100 users
console.log('\n╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                          DETAILED COST BREAKDOWN (100 USERS)                         ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

HOSTING_OPTIONS.forEach(option => {
  const result = calculateMonthlyCost(option, 100);
  console.log(`${option.provider} - ${option.gpuType}:`);
  console.log(`  Hourly rate: $${(option.pricePerGpuHour * option.gpusNeeded).toFixed(2)}/hr (${option.gpusNeeded} GPUs @ $${option.pricePerGpuHour}/GPU)`);
  console.log(`  Instances needed: ${result.instancesUsed}`);
  console.log(`  Hours/day: ${result.hoursPerDay}`);
  console.log(`  Monthly cost: $${result.monthlyCost.toFixed(2)}`);
  console.log(`  Cost per user: $${result.costPerUser.toFixed(2)}`);
  console.log(`  Reliability: ${option.reliability}`);
  if (option.notes) console.log(`  Notes: ${option.notes}`);
  console.log('');
});

// Comparison with DeepInfra serverless
console.log('\n╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                     COMPARISON: SELF-HOSTING vs DEEPINFRA SERVERLESS                ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

const deepInfraCosts = [
  { users: 100, usage: 'Low (5 msgs/day)', cost: 32.27 },
  { users: 100, usage: 'Medium (10 msgs/day)', cost: 65.52 },
  { users: 100, usage: 'High (20 msgs/day)', cost: 134.16 },
];

console.log('DeepInfra Serverless (100 users):');
deepInfraCosts.forEach(({ usage, cost }) => {
  console.log(`  ${usage}: $${cost}/month`);
});
console.log('');

// Find cheapest self-hosting option
const cheapestOption = HOSTING_OPTIONS.reduce((min, option) => {
  const minCost = calculateMonthlyCost(min, 100).monthlyCost;
  const optionCost = calculateMonthlyCost(option, 100).monthlyCost;
  return optionCost < minCost ? option : min;
});

const cheapestCost = calculateMonthlyCost(cheapestOption, 100);
console.log(`Cheapest Self-Hosting (100 users):`);
console.log(`  ${cheapestOption.provider} ${cheapestOption.gpuType}: $${cheapestCost.monthlyCost.toFixed(2)}/month`);
console.log(`  Cost per user: $${cheapestCost.costPerUser.toFixed(2)}`);
console.log('');

console.log('💡 KEY INSIGHTS:');
console.log('   • Self-hosting becomes cost-effective at ~300+ users');
console.log('   • For <300 users, DeepInfra serverless is more economical');
console.log('   • Self-hosting requires DevOps expertise, monitoring, and maintenance');
console.log('   • Budget options (Vast.ai, Lambda) may have availability issues');
console.log('   • GCP and RunPod offer good balance of cost and reliability');
console.log('');

export { HOSTING_OPTIONS, calculateMonthlyCost, calculateInstancesNeeded };
