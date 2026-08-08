import { type DeviceType, getRandomDevice } from '../distributions/devices.js';
import { getRandomGeo, getRandomLanguage } from '../distributions/geographic.js';
import { generateTimestampInWindow } from '../distributions/temporal.js';
import { pickRandom, randomInt, uuid } from '../utils.js';

export interface SessionData {
  id: string;
  websiteId: string;
  distinctId: string | null;
  browser: string;
  os: string;
  device: DeviceType;
  screen: string;
  language: string;
  country: string;
  region: string;
  city: string;
  createdAt: Date;
}

/** A person, as opposed to a single visit. Returning visitors reuse one of these. */
export interface Visitor {
  distinctId: string | null;
  browser: string;
  os: string;
  device: DeviceType;
  screen: string;
  language: string;
  country: string;
  region: string;
  city: string;
}

const FIRST_NAMES = [
  'avery',
  'jordan',
  'riley',
  'casey',
  'morgan',
  'quinn',
  'skyler',
  'rowan',
  'emerson',
  'harper',
  'kai',
  'noor',
  'ines',
  'mateo',
  'yuki',
  'lena',
  'omar',
  'priya',
  'tomas',
  'zara',
];

const LAST_NAMES = [
  'chen',
  'kowalski',
  'okafor',
  'silva',
  'novak',
  'ahmed',
  'garcia',
  'muller',
  'tanaka',
  'oconnell',
  'nguyen',
  'rossi',
  'andersen',
  'haddad',
  'patel',
];

const EMAIL_DOMAINS = [
  'northwind.example',
  'contoso.example',
  'globex.example',
  'initech.example',
  'umbrella.example',
  'hooli.example',
  'gmail.example',
];

export function generateDistinctId(): string {
  return `${pickRandom(FIRST_NAMES)}.${pickRandom(LAST_NAMES)}${randomInt(1, 99)}@${pickRandom(
    EMAIL_DOMAINS,
  )}`;
}

export interface VisitorPoolOptions {
  /** Share of sessions that belong to a signed-in / identified person. */
  identifiedRate: number;
  /** Share of sessions that come from someone the site has seen before. */
  returnRate: number;
  /** Upper bound on remembered identities, to keep long backfills bounded. */
  maxSize?: number;
}

/**
 * Remembers a bounded set of visitors so that sessions repeat across days: the same
 * person, on the same device, from the same city. Without this every session looks
 * like a brand new stranger and the sessions and profile views read as noise.
 */
export class VisitorPool {
  private visitors: Visitor[] = [];
  private readonly maxSize: number;

  constructor(private options: VisitorPoolOptions) {
    this.maxSize = options.maxSize ?? 4000;
  }

  /** Preload identities already in the database so restarts keep the same people. */
  add(visitor: Visitor): void {
    if (this.visitors.length < this.maxSize) {
      this.visitors.push(visitor);
    } else {
      this.visitors[randomInt(0, this.maxSize - 1)] = visitor;
    }
  }

  get size(): number {
    return this.visitors.length;
  }

  next(): Visitor {
    if (this.visitors.length > 0 && Math.random() < this.options.returnRate) {
      // Weight towards the most recently added identities.
      const window = Math.min(this.visitors.length, 500);
      const index = this.visitors.length - 1 - randomInt(0, window - 1);
      return this.visitors[index];
    }

    const device = getRandomDevice();
    const geo = getRandomGeo();

    const visitor: Visitor = {
      distinctId: Math.random() < this.options.identifiedRate ? generateDistinctId() : null,
      browser: device.browser,
      os: device.os,
      device: device.device,
      screen: device.screen,
      language: getRandomLanguage(),
      country: geo.country,
      region: geo.region,
      city: geo.city,
    };

    this.add(visitor);

    return visitor;
  }
}

export function createSessions(
  websiteId: string,
  from: Date,
  to: Date,
  count: number,
  pool: VisitorPool,
): SessionData[] {
  const sessions: SessionData[] = [];

  for (let i = 0; i < count; i++) {
    const visitor = pool.next();

    sessions.push({
      id: uuid(),
      websiteId,
      distinctId: visitor.distinctId,
      browser: visitor.browser,
      os: visitor.os,
      device: visitor.device,
      screen: visitor.screen,
      language: visitor.language,
      country: visitor.country,
      region: visitor.region,
      city: visitor.city,
      createdAt: generateTimestampInWindow(from, to),
    });
  }

  sessions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return sessions;
}
