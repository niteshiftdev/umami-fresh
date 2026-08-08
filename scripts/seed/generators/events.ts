import { getRandomReferrer, type ReferrerInfo } from '../distributions/referrers.js';
import { generateWebVitals } from '../distributions/vitals.js';
import { addSeconds, randomInt, uuid } from '../utils.js';
import type { SessionData } from './sessions.js';

export const EVENT_TYPE = {
  pageView: 1,
  customEvent: 2,
  performance: 5,
} as const;

/** Share of page views that also report web vitals, matching a typical RUM sample. */
const PERFORMANCE_SAMPLE_RATE = 0.55;

export interface PageConfig {
  path: string;
  title: string;
  weight: number;
  avgTimeOnPage: number;
}

export interface CustomEventConfig {
  name: string;
  weight: number;
  pages?: string[];
  data?: Record<string, string[] | number[]>;
}

export interface JourneyConfig {
  pages: string[];
  weight: number;
}

export interface EventData {
  id: string;
  websiteId: string;
  sessionId: string;
  visitId: string;
  eventType: number;
  urlPath: string;
  urlQuery: string | null;
  pageTitle: string | null;
  hostname: string;
  referrerDomain: string | null;
  referrerPath: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  gclid: string | null;
  fbclid: string | null;
  eventName: string | null;
  tag: string | null;
  lcp: number | null;
  inp: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  createdAt: Date;
}

export interface EventDataEntry {
  id: string;
  websiteId: string;
  websiteEventId: string;
  dataKey: string;
  stringValue: string | null;
  numberValue: number | null;
  dateValue: Date | null;
  dataType: number;
  createdAt: Date;
}

export interface SiteConfig {
  hostname: string;
  pages: PageConfig[];
  journeys: JourneyConfig[];
  customEvents: CustomEventConfig[];
  /** Session properties written for identified visitors. */
  sessionProperties?: Record<string, string[] | number[]>;
}

function getPageTitle(pages: PageConfig[], path: string): string | null {
  const page = pages.find(p => p.path === path);
  return page?.title ?? null;
}

function getPageTimeOnPage(pages: PageConfig[], path: string): number {
  const page = pages.find(p => p.path === path);
  return page?.avgTimeOnPage ?? 30;
}

/** Campaign traffic lands with its parameters still on the URL. */
function buildUrlQuery(referrer: ReferrerInfo): string | null {
  const params = new URLSearchParams();

  if (referrer.utmSource) params.set('utm_source', referrer.utmSource);
  if (referrer.utmMedium) params.set('utm_medium', referrer.utmMedium);
  if (referrer.utmCampaign) params.set('utm_campaign', referrer.utmCampaign);
  if (referrer.utmContent) params.set('utm_content', referrer.utmContent);
  if (referrer.utmTerm) params.set('utm_term', referrer.utmTerm);
  if (referrer.gclid) params.set('gclid', referrer.gclid);
  if (referrer.fbclid) params.set('fbclid', referrer.fbclid);

  const query = params.toString();

  return query === '' ? null : query;
}

function baseEvent(
  session: SessionData,
  visitId: string,
  siteConfig: SiteConfig,
  urlPath: string,
  pageTitle: string | null,
  createdAt: Date,
): EventData {
  return {
    id: uuid(),
    websiteId: session.websiteId,
    sessionId: session.id,
    visitId,
    eventType: EVENT_TYPE.pageView,
    urlPath,
    urlQuery: null,
    pageTitle,
    hostname: siteConfig.hostname,
    referrerDomain: null,
    referrerPath: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    gclid: null,
    fbclid: null,
    eventName: null,
    tag: null,
    lcp: null,
    inp: null,
    cls: null,
    fcp: null,
    ttfb: null,
    createdAt,
  };
}

export interface GenerateEventsOptions {
  /** Drop anything that would be timestamped after this instant. */
  until?: Date;
}

export function generateEventsForSession(
  session: SessionData,
  siteConfig: SiteConfig,
  journey: string[],
  options: GenerateEventsOptions = {},
): { events: EventData[]; eventDataEntries: EventDataEntry[] } {
  const events: EventData[] = [];
  const eventDataEntries: EventDataEntry[] = [];
  const visitId = uuid();
  const until = options.until;

  let currentTime = session.createdAt;
  const referrer = getRandomReferrer();

  for (let i = 0; i < journey.length; i++) {
    if (until && currentTime > until) {
      break;
    }

    const pagePath = journey[i];
    const isFirstPage = i === 0;
    const pageTitle = getPageTitle(siteConfig.pages, pagePath);

    const pageView = baseEvent(session, visitId, siteConfig, pagePath, pageTitle, currentTime);

    if (isFirstPage) {
      pageView.urlQuery = buildUrlQuery(referrer);
      pageView.referrerDomain = referrer.domain;
      pageView.referrerPath = referrer.path;
      pageView.utmSource = referrer.utmSource;
      pageView.utmMedium = referrer.utmMedium;
      pageView.utmCampaign = referrer.utmCampaign;
      pageView.utmContent = referrer.utmContent;
      pageView.utmTerm = referrer.utmTerm;
      pageView.gclid = referrer.gclid;
      pageView.fbclid = referrer.fbclid;
    }

    events.push(pageView);

    // Web vitals arrive shortly after the page view as their own event.
    if (Math.random() < PERFORMANCE_SAMPLE_RATE) {
      const vitalsTime = addSeconds(currentTime, randomInt(1, 4));

      if (!until || vitalsTime <= until) {
        const vitals = generateWebVitals(session.device, pagePath);
        const performance = baseEvent(
          session,
          visitId,
          siteConfig,
          pagePath,
          pageTitle,
          vitalsTime,
        );

        performance.eventType = EVENT_TYPE.performance;
        performance.lcp = vitals.lcp;
        performance.inp = vitals.inp;
        performance.cls = vitals.cls;
        performance.fcp = vitals.fcp;
        performance.ttfb = vitals.ttfb;

        events.push(performance);
      }
    }

    // Check for custom events on this page
    for (const customEvent of siteConfig.customEvents) {
      // Check if this event can occur on this page
      if (customEvent.pages && !customEvent.pages.includes(pagePath)) {
        continue;
      }

      // Random chance based on weight
      if (Math.random() < customEvent.weight) {
        currentTime = addSeconds(currentTime, randomInt(2, 15));

        if (until && currentTime > until) {
          break;
        }

        const custom = baseEvent(session, visitId, siteConfig, pagePath, pageTitle, currentTime);
        custom.eventType = EVENT_TYPE.customEvent;
        custom.eventName = customEvent.name;

        events.push(custom);

        // Generate event data if configured
        if (customEvent.data) {
          for (const [key, values] of Object.entries(customEvent.data)) {
            const value = values[Math.floor(Math.random() * values.length)];
            const isNumber = typeof value === 'number';

            eventDataEntries.push({
              id: uuid(),
              websiteId: session.websiteId,
              websiteEventId: custom.id,
              dataKey: key,
              stringValue: isNumber ? null : String(value),
              numberValue: isNumber ? value : null,
              dateValue: null,
              dataType: isNumber ? 2 : 1, // 1 = string, 2 = number
              createdAt: currentTime,
            });
          }
        }
      }
    }

    // Time spent on page before navigating
    const timeOnPage = getPageTimeOnPage(siteConfig.pages, pagePath);
    const variance = Math.floor(timeOnPage * 0.5);
    const actualTime = timeOnPage + randomInt(-variance, variance);
    currentTime = addSeconds(currentTime, Math.max(5, actualTime));
  }

  return { events, eventDataEntries };
}
