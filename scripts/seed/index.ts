/* eslint-disable no-console */
import 'dotenv/config';
import { connect, type Db } from './db.js';
import {
  generateTimestampInWindow,
  getSessionCountForWindow,
  startOfDay,
  startOfNextDay,
} from './distributions/temporal.js';
import {
  type EventData,
  type EventDataEntry,
  generateEventsForSession,
  type SiteConfig,
} from './generators/events.js';
import {
  generateRevenueForEvents,
  type RevenueConfig,
  type RevenueData,
} from './generators/revenue.js';
import { createSessions, type SessionData, VisitorPool } from './generators/sessions.js';
import {
  BLOG_SESSIONS_PER_DAY,
  BLOG_WEBSITE_DOMAIN,
  BLOG_WEBSITE_NAME,
  getBlogJourney,
  getBlogSiteConfig,
} from './sites/blog.js';
import {
  getSaasJourney,
  getSaasSiteConfig,
  SAAS_SESSIONS_PER_DAY,
  SAAS_WEBSITE_DOMAIN,
  SAAS_WEBSITE_NAME,
  saasRevenueConfigs,
} from './sites/saas.js';
import {
  getShopJourney,
  getShopSiteConfig,
  SHOP_SESSIONS_PER_DAY,
  SHOP_WEBSITE_DOMAIN,
  SHOP_WEBSITE_NAME,
  shopRevenueConfigs,
} from './sites/shop.js';
import { formatNumber, pickRandom, progressBar, uuid } from './utils.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Long enough to fill every range the date picker offers, including "last 12 months"
 * and "this year" from any point in the calendar.
 */
export const DEFAULT_BACKFILL_DAYS = 400;

/** Share of visits that come from a browser still holding an earlier session. */
const REVISIT_RATE = 0.18;

/** How long a session stays eligible to be revisited. */
const SESSION_LIFETIME_DAYS = 2;

const MAX_RECENT_SESSIONS = 2000;

export interface SeedConfig {
  days: number;
  clear: boolean;
  verbose: boolean;
}

export interface SeedResult {
  websites: number;
  sessions: number;
  events: number;
  eventData: number;
  sessionData: number;
  revenue: number;
}

interface SiteDefinition {
  name: string;
  domain: string;
  sessionsPerDay: number;
  getSiteConfig: () => SiteConfig;
  getJourney: () => string[];
  revenueConfigs?: RevenueConfig[];
  /** Share of visitors the site can put a name to. */
  identifiedRate: number;
  /** Share of sessions that come from someone seen before. */
  returnRate: number;
  /** Share of identified sessions that record session properties. */
  sessionPropertyRate: number;
}

const SITES: SiteDefinition[] = [
  {
    name: BLOG_WEBSITE_NAME,
    domain: BLOG_WEBSITE_DOMAIN,
    sessionsPerDay: BLOG_SESSIONS_PER_DAY,
    getSiteConfig: getBlogSiteConfig,
    getJourney: getBlogJourney,
    identifiedRate: 0.08,
    returnRate: 0.25,
    sessionPropertyRate: 0.5,
  },
  {
    name: SAAS_WEBSITE_NAME,
    domain: SAAS_WEBSITE_DOMAIN,
    sessionsPerDay: SAAS_SESSIONS_PER_DAY,
    getSiteConfig: getSaasSiteConfig,
    getJourney: getSaasJourney,
    revenueConfigs: saasRevenueConfigs,
    identifiedRate: 0.45,
    returnRate: 0.5,
    sessionPropertyRate: 0.8,
  },
  {
    name: SHOP_WEBSITE_NAME,
    domain: SHOP_WEBSITE_DOMAIN,
    sessionsPerDay: SHOP_SESSIONS_PER_DAY,
    getSiteConfig: getShopSiteConfig,
    getJourney: getShopJourney,
    revenueConfigs: shopRevenueConfigs,
    identifiedRate: 0.3,
    returnRate: 0.4,
    sessionPropertyRate: 0.7,
  },
];

const SESSION_COLUMNS = [
  'session_id',
  'website_id',
  'browser',
  'os',
  'device',
  'screen',
  'language',
  'country',
  'region',
  'city',
  'distinct_id',
  'created_at',
];

const EVENT_COLUMNS = [
  'event_id',
  'website_id',
  'session_id',
  'visit_id',
  'created_at',
  'url_path',
  'url_query',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'referrer_path',
  'referrer_domain',
  'page_title',
  'gclid',
  'fbclid',
  'event_type',
  'event_name',
  'tag',
  'hostname',
  'lcp',
  'inp',
  'cls',
  'fcp',
  'ttfb',
];

const EVENT_DATA_COLUMNS = [
  'event_data_id',
  'website_id',
  'website_event_id',
  'data_key',
  'string_value',
  'number_value',
  'date_value',
  'data_type',
  'created_at',
];

const SESSION_DATA_COLUMNS = [
  'session_data_id',
  'website_id',
  'session_id',
  'data_key',
  'string_value',
  'number_value',
  'date_value',
  'data_type',
  'distinct_id',
  'created_at',
];

const REVENUE_COLUMNS = [
  'revenue_id',
  'website_id',
  'session_id',
  'event_id',
  'event_name',
  'currency',
  'revenue',
  'created_at',
];

interface SessionDataEntry {
  id: string;
  websiteId: string;
  sessionId: string;
  dataKey: string;
  stringValue: string | null;
  numberValue: number | null;
  dataType: number;
  distinctId: string | null;
  createdAt: Date;
}

interface DataBatch {
  sessions: SessionData[];
  events: EventData[];
  eventData: EventDataEntry[];
  sessionData: SessionDataEntry[];
  revenue: RevenueData[];
}

function emptyResult(): SeedResult {
  return { websites: 0, sessions: 0, events: 0, eventData: 0, sessionData: 0, revenue: 0 };
}

function addResult(total: SeedResult, part: SeedResult): void {
  total.websites += part.websites;
  total.sessions += part.sessions;
  total.events += part.events;
  total.eventData += part.eventData;
  total.sessionData += part.sessionData;
  total.revenue += part.revenue;
}

async function findAdminUserId(db: Db): Promise<string> {
  const rows = await db.query<{ user_id: string }>(
    `select user_id from "user"
     where role = 'admin' and deleted_at is null
     order by created_at
     limit 1`,
  );

  if (rows.length === 0) {
    throw new Error(
      'No admin user found in the database.\n' +
        'Run the database migrations first — they create the default admin user (username: admin, password: umami).',
    );
  }

  return rows[0].user_id;
}

async function findWebsiteId(db: Db, name: string): Promise<string | null> {
  const rows = await db.query<{ website_id: string }>(
    `select website_id from website where name = $1 and deleted_at is null limit 1`,
    [name],
  );

  return rows[0]?.website_id ?? null;
}

async function createWebsite(
  db: Db,
  site: SiteDefinition,
  userId: string,
  createdAt: Date,
): Promise<string> {
  const websiteId = uuid();

  await db.query(
    `insert into website (website_id, name, domain, user_id, created_by, created_at)
     values ($1, $2, $3, $4, $4, $5)`,
    [websiteId, site.name, site.domain, userId, createdAt],
  );

  return websiteId;
}

async function getLastEventTime(db: Db, websiteId: string): Promise<Date | null> {
  const rows = await db.query<{ last: Date | null }>(
    `select max(created_at) as last from website_event where website_id = $1`,
    [websiteId],
  );

  return rows[0]?.last ?? null;
}

/**
 * Per-site state that has to outlive a single day so people and their sessions carry
 * across day boundaries and across process restarts.
 */
interface SiteRuntime {
  pool: VisitorPool;
  /** Sessions recent enough that the same browser could still be carrying the cookie. */
  recentSessions: SessionData[];
}

/** Reload identities and live sessions from the database so a restart continues the story. */
async function loadRuntime(db: Db, websiteId: string, site: SiteDefinition): Promise<SiteRuntime> {
  const pool = new VisitorPool({
    identifiedRate: site.identifiedRate,
    returnRate: site.returnRate,
  });

  const rows = await db.query<any>(
    `select session_id, distinct_id, browser, os, device, screen, language, country, region, city,
            created_at
     from session
     where website_id = $1
     order by created_at desc
     limit 2000`,
    [websiteId],
  );

  const recentSessions: SessionData[] = [];
  const cutoff = Date.now() - SESSION_LIFETIME_DAYS * DAY_MS;

  // Oldest first, so the pool's recency bias matches the order sessions were created.
  for (const row of rows.reverse()) {
    pool.add({
      distinctId: row.distinct_id,
      browser: row.browser,
      os: row.os,
      device: row.device,
      screen: row.screen,
      language: row.language,
      country: row.country,
      region: row.region,
      city: row.city,
    });

    if (row.created_at && row.created_at.getTime() >= cutoff) {
      recentSessions.push({
        id: row.session_id,
        websiteId,
        distinctId: row.distinct_id,
        browser: row.browser,
        os: row.os,
        device: row.device,
        screen: row.screen,
        language: row.language,
        country: row.country,
        region: row.region,
        city: row.city,
        createdAt: row.created_at,
      });
    }
  }

  return { pool, recentSessions };
}

function generateSessionProperties(
  session: SessionData,
  siteConfig: SiteConfig,
  site: SiteDefinition,
): SessionDataEntry[] {
  if (!siteConfig.sessionProperties || !session.distinctId) {
    return [];
  }

  if (Math.random() > site.sessionPropertyRate) {
    return [];
  }

  return Object.entries(siteConfig.sessionProperties).map(([key, values]) => {
    const value = pickRandom(values as (string | number)[]);
    const isNumber = typeof value === 'number';

    return {
      id: uuid(),
      websiteId: session.websiteId,
      sessionId: session.id,
      dataKey: key,
      stringValue: isNumber ? null : String(value),
      numberValue: isNumber ? value : null,
      dataType: isNumber ? 2 : 1,
      distinctId: session.distinctId,
      createdAt: session.createdAt,
    };
  });
}

function generateWindow(
  websiteId: string,
  site: SiteDefinition,
  siteConfig: SiteConfig,
  runtime: SiteRuntime,
  from: Date,
  to: Date,
  now: Date,
): DataBatch {
  const batch: DataBatch = {
    sessions: [],
    events: [],
    eventData: [],
    sessionData: [],
    revenue: [],
  };

  const count = getSessionCountForWindow(site.sessionsPerDay, from, to, now);

  if (count === 0) {
    return batch;
  }

  // Some of this window's traffic is a browser coming back with a session it already
  // has, which is what makes visits outnumber visitors the way they do in real data.
  const revisits = Math.min(
    runtime.recentSessions.length,
    Math.round(count * REVISIT_RATE * Math.random() * 2),
  );
  const newSessions = createSessions(websiteId, from, to, count - revisits, runtime.pool);

  const visits: { session: SessionData; isNew: boolean }[] = newSessions.map(session => ({
    session,
    isNew: true,
  }));

  for (let i = 0; i < revisits; i++) {
    const previous = pickRandom(runtime.recentSessions);

    visits.push({
      session: { ...previous, createdAt: generateTimestampInWindow(from, to) },
      isNew: false,
    });
  }

  for (const { session, isNew } of visits) {
    const { events, eventDataEntries } = generateEventsForSession(
      session,
      siteConfig,
      site.getJourney(),
      // Nothing may be timestamped past the window, so no seeded traffic lands in the future.
      { until: to },
    );

    if (events.length === 0) {
      continue;
    }

    if (isNew) {
      batch.sessions.push(session);
      batch.sessionData.push(...generateSessionProperties(session, siteConfig, site));
    }

    batch.events.push(...events);
    batch.eventData.push(...eventDataEntries);

    if (site.revenueConfigs) {
      batch.revenue.push(...generateRevenueForEvents(events, site.revenueConfigs));
    }
  }

  // Carry this window's sessions forward, dropping any that have gone cold.
  const cutoff = to.getTime() - SESSION_LIFETIME_DAYS * DAY_MS;

  runtime.recentSessions = runtime.recentSessions
    .filter(session => session.createdAt.getTime() >= cutoff)
    .concat(batch.sessions)
    .slice(-MAX_RECENT_SESSIONS);

  return batch;
}

async function writeBatch(db: Db, batch: DataBatch): Promise<void> {
  await db.insert(
    'session',
    SESSION_COLUMNS,
    batch.sessions.map(s => [
      s.id,
      s.websiteId,
      s.browser,
      s.os,
      s.device,
      s.screen,
      s.language,
      s.country,
      s.region,
      s.city,
      s.distinctId,
      s.createdAt,
    ]),
  );

  await db.insert(
    'website_event',
    EVENT_COLUMNS,
    batch.events.map(e => [
      e.id,
      e.websiteId,
      e.sessionId,
      e.visitId,
      e.createdAt,
      e.urlPath,
      e.urlQuery,
      e.utmSource,
      e.utmMedium,
      e.utmCampaign,
      e.utmContent,
      e.utmTerm,
      e.referrerPath,
      e.referrerDomain,
      e.pageTitle,
      e.gclid,
      e.fbclid,
      e.eventType,
      e.eventName,
      e.tag,
      e.hostname,
      e.lcp,
      e.inp,
      e.cls,
      e.fcp,
      e.ttfb,
    ]),
  );

  await db.insert(
    'event_data',
    EVENT_DATA_COLUMNS,
    batch.eventData.map(d => [
      d.id,
      d.websiteId,
      d.websiteEventId,
      d.dataKey,
      d.stringValue,
      d.numberValue,
      d.dateValue,
      d.dataType,
      d.createdAt,
    ]),
  );

  await db.insert(
    'session_data',
    SESSION_DATA_COLUMNS,
    batch.sessionData.map(d => [
      d.id,
      d.websiteId,
      d.sessionId,
      d.dataKey,
      d.stringValue,
      d.numberValue,
      null,
      d.dataType,
      d.distinctId,
      d.createdAt,
    ]),
  );

  await db.insert(
    'revenue',
    REVENUE_COLUMNS,
    batch.revenue.map(r => [
      r.id,
      r.websiteId,
      r.sessionId,
      r.eventId,
      r.eventName,
      r.currency,
      r.revenue,
      r.createdAt,
    ]),
  );
}

/**
 * Fills the gap between `from` and `now` one calendar day at a time, so memory stays
 * flat whether the gap is four hundred days or the ninety seconds since the last tick.
 */
async function fillRange(
  db: Db,
  websiteId: string,
  site: SiteDefinition,
  runtime: SiteRuntime,
  from: Date,
  now: Date,
  verbose: boolean,
): Promise<SeedResult> {
  const siteConfig = site.getSiteConfig();
  const result = emptyResult();
  const totalDays = Math.max(1, Math.ceil((now.getTime() - startOfDay(from).getTime()) / DAY_MS));

  let cursor = new Date(from);
  let dayIndex = 0;

  while (cursor < now) {
    const windowEnd = new Date(Math.min(startOfNextDay(cursor).getTime(), now.getTime()));
    const batch = generateWindow(websiteId, site, siteConfig, runtime, cursor, windowEnd, now);

    await writeBatch(db, batch);

    result.sessions += batch.sessions.length;
    result.events += batch.events.length;
    result.eventData += batch.eventData.length;
    result.sessionData += batch.sessionData.length;
    result.revenue += batch.revenue.length;

    dayIndex++;
    cursor = windowEnd;

    if (totalDays > 1 && (verbose || dayIndex % 10 === 0 || cursor >= now)) {
      const day = Math.min(dayIndex, totalDays);

      // Redraw in place on a terminal; keep setup logs to one line per 50 days.
      if (process.stdout.isTTY) {
        process.stdout.write(`\r  ${progressBar(day, totalDays)} day ${day}/${totalDays}`);
      } else if (day % 50 === 0 || day === totalDays) {
        console.log(`  ${progressBar(day, totalDays)} day ${day}/${totalDays}`);
      }
    }
  }

  if (totalDays > 1 && process.stdout.isTTY) {
    process.stdout.write('\n');
  }

  return result;
}

/**
 * Brings every demo site up to the present.
 *
 * A site that does not exist yet is created and backfilled `days` days. A site that
 * already has data is topped up from its most recent event, which is what keeps the
 * dashboard current across restarts and resumes without duplicating anything.
 */
export async function sync(
  config: SeedConfig,
  db: Db,
  runtimes: Map<string, SiteRuntime>,
): Promise<SeedResult> {
  const now = new Date();
  const userId = await findAdminUserId(db);
  const earliest = new Date(now.getTime() - config.days * DAY_MS);
  const result = emptyResult();

  for (const site of SITES) {
    let websiteId = await findWebsiteId(db, site.name);
    let from: Date;

    if (websiteId) {
      const lastEvent = await getLastEventTime(db, websiteId);

      // Never redo more than the backfill window, however long the gap has been.
      from = lastEvent
        ? new Date(Math.max(lastEvent.getTime() + 1000, earliest.getTime()))
        : startOfDay(earliest);

      if (from >= now) {
        continue;
      }
    } else {
      from = startOfDay(earliest);
      websiteId = await createWebsite(db, site, userId, from);
      result.websites += 1;
      console.log(`\n${site.name}: created, backfilling ${config.days} days`);
    }

    if (!runtimes.has(websiteId)) {
      runtimes.set(websiteId, await loadRuntime(db, websiteId, site));
    }

    addResult(
      result,
      await fillRange(
        db,
        websiteId,
        site,
        runtimes.get(websiteId) as SiteRuntime,
        from,
        now,
        config.verbose,
      ),
    );
  }

  return result;
}

/** Arbitrary constant identifying this script's Postgres advisory lock. */
const SEED_LOCK_ID = 771002451;

async function acquireSeedLock(db: Db): Promise<boolean> {
  const rows = await db.query<{ locked: boolean }>('select pg_try_advisory_lock($1) as locked', [
    SEED_LOCK_ID,
  ]);

  return rows[0]?.locked === true;
}

async function clearDemoData(db: Db): Promise<void> {
  console.log('Clearing existing demo data...');

  const rows = await db.query<{ website_id: string }>(
    `select website_id from website where name = any($1)`,
    [SITES.map(site => site.name)],
  );

  const websiteIds = rows.map(row => row.website_id);

  if (websiteIds.length === 0) {
    console.log('  No existing demo websites found');
    return;
  }

  for (const table of [
    'revenue',
    'event_data',
    'session_data',
    'website_event',
    'session',
    'segment',
    'report',
  ]) {
    await db.query(`delete from ${table} where website_id = any($1)`, [websiteIds]);
  }

  await db.query(`delete from website where website_id = any($1)`, [websiteIds]);

  console.log(`  Cleared ${websiteIds.length} demo website(s)`);
}

function printResult(result: SeedResult, elapsedMs: number): void {
  console.log(`\n${'─'.repeat(50)}`);
  console.log('Seed complete');
  console.log(`${'─'.repeat(50)}`);
  console.log(`  Websites created: ${formatNumber(result.websites)}`);
  console.log(`  Sessions:         ${formatNumber(result.sessions)}`);
  console.log(`  Events:           ${formatNumber(result.events)}`);
  console.log(`  Event data:       ${formatNumber(result.eventData)}`);
  console.log(`  Session data:     ${formatNumber(result.sessionData)}`);
  console.log(`  Revenue:          ${formatNumber(result.revenue)}`);
  console.log(`  Elapsed:          ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log(`${'─'.repeat(50)}\n`);
}

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      'DATABASE_URL environment variable is not set.\n' +
        'Example: DATABASE_URL=postgresql://user:password@localhost:5432/umami',
    );
  }

  return url;
}

export async function seed(config: SeedConfig): Promise<SeedResult> {
  const db = await connect(databaseUrl());
  const started = Date.now();

  try {
    if (config.clear) {
      await clearDemoData(db);
    }

    const result = await sync(config, db, new Map());

    printResult(result, Date.now() - started);

    return result;
  } finally {
    await db.close();
  }
}

/**
 * Keeps the demo current while the app runs: each tick generates the traffic that
 * "happened" since the last one, so realtime and today never go stale, and a long
 * suspend is filled in on the first tick after the sandbox comes back.
 */
export async function seedLive(config: SeedConfig, intervalSeconds: number): Promise<void> {
  const db = await connect(databaseUrl());
  const runtimes = new Map<string, SiteRuntime>();

  let stopped = false;
  let wake: (() => void) | null = null;

  // Wake out of the sleep immediately, so a supervisor stopping this service does not
  // have to wait out the interval and kill an unresponsive process.
  const stop = () => {
    stopped = true;
    wake?.();
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  const sleep = (ms: number) =>
    new Promise<void>(resolve => {
      const timer = setTimeout(resolve, ms);
      wake = () => {
        clearTimeout(timer);
        resolve();
      };
    });

  console.log(`Live seeding every ${intervalSeconds}s.`);

  try {
    // Only one live seeder may run at a time, or the demo sites get double the traffic.
    while (!stopped && !(await acquireSeedLock(db))) {
      console.log('Another live seeder holds the seed lock; waiting.');
      await sleep(intervalSeconds * 1000);
    }

    while (!stopped) {
      const started = Date.now();
      const result = await sync(config, db, runtimes);

      console.log(
        `${new Date().toISOString()} +${formatNumber(result.sessions)} sessions, ` +
          `+${formatNumber(result.events)} events (${Date.now() - started}ms)`,
      );

      await sleep(intervalSeconds * 1000);
    }
  } finally {
    await db.close();
  }
}
