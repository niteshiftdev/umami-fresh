import { randomFloat, uuid, type WeightedOption, weightedRandom } from '../utils.js';
import type { EventData } from './events.js';

export interface RevenueConfig {
  eventName: string;
  minAmount: number;
  maxAmount: number;
  currency: string;
  weight: number;
}

export interface RevenueData {
  id: string;
  websiteId: string;
  sessionId: string;
  eventId: string;
  eventName: string;
  currency: string;
  revenue: number;
  createdAt: Date;
}

export function generateRevenue(event: EventData, config: RevenueConfig): RevenueData {
  const revenue = randomFloat(config.minAmount, config.maxAmount);

  return {
    id: uuid(),
    websiteId: event.websiteId,
    sessionId: event.sessionId,
    eventId: event.id,
    eventName: event.eventName as string,
    currency: config.currency,
    revenue: Math.round(revenue * 100) / 100,
    createdAt: event.createdAt,
  };
}

/**
 * Every revenue-bearing event gets exactly one revenue row; the configs act as a
 * weighted mix of order sizes and currencies rather than sequential coin flips.
 */
export function generateRevenueForEvents(
  events: EventData[],
  configs: RevenueConfig[],
): RevenueData[] {
  const revenueEntries: RevenueData[] = [];

  for (const event of events) {
    if (!event.eventName) continue;

    const matching = configs.filter(config => config.eventName === event.eventName);

    if (matching.length === 0) continue;

    const options: WeightedOption<RevenueConfig>[] = matching.map(config => ({
      value: config,
      weight: config.weight,
    }));

    revenueEntries.push(generateRevenue(event, weightedRandom(options)));
  }

  return revenueEntries;
}
