import type { ReferrerMix } from '../distributions/referrers.js';
import type {
  CustomEventConfig,
  JourneyConfig,
  PageConfig,
  SiteConfig,
} from '../generators/events.js';
import type { RevenueConfig } from '../generators/revenue.js';
import { type WeightedOption, weightedRandom } from '../utils.js';

export const SAAS_WEBSITE_NAME = 'Clearloom';
export const SAAS_WEBSITE_DOMAIN = 'clearloom.com';

const docsSections = ['quickstart', 'authentication', 'webhooks', 'api-reference', 'integrations'];

const posts = [
  { slug: 'ach-payouts-are-live', title: 'ACH payouts are live' },
  { slug: 'inside-the-new-webhook-pipeline', title: 'Inside the new webhook pipeline' },
  {
    slug: 'how-northgate-studio-closes-books-in-a-day',
    title: 'How Northgate Studio closes its books in a day',
  },
  { slug: 'soc-2-type-ii', title: 'We finished our SOC 2 Type II' },
];

export const saasPages: PageConfig[] = [
  {
    path: '/',
    title: 'Clearloom — Billing built for product teams',
    weight: 0.2,
    avgTimeOnPage: 45,
  },
  { path: '/features', title: 'Features', weight: 0.15, avgTimeOnPage: 90 },
  { path: '/pricing', title: 'Pricing', weight: 0.15, avgTimeOnPage: 120 },
  { path: '/docs', title: 'Clearloom Docs', weight: 0.1, avgTimeOnPage: 60 },
  { path: '/blog', title: 'Changelog & Blog', weight: 0.05, avgTimeOnPage: 45 },
  { path: '/signup', title: 'Start a free trial', weight: 0.08, avgTimeOnPage: 90 },
  { path: '/login', title: 'Log in', weight: 0.05, avgTimeOnPage: 30 },
  { path: '/demo', title: 'Talk to sales', weight: 0.05, avgTimeOnPage: 60 },
  ...docsSections.map(slug => ({
    path: `/docs/${slug}`,
    title: `Docs: ${slug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')}`,
    weight: 0.02,
    avgTimeOnPage: 180,
  })),
  ...posts.map(post => ({
    path: `/blog/${post.slug}`,
    title: post.title,
    weight: 0.02,
    avgTimeOnPage: 150,
  })),
];

export const saasJourneys: JourneyConfig[] = [
  // Conversion funnel
  { pages: ['/', '/features', '/pricing', '/signup'], weight: 0.12 },
  { pages: ['/', '/pricing', '/signup'], weight: 0.1 },
  { pages: ['/pricing', '/signup'], weight: 0.08 },

  // Feature exploration
  { pages: ['/', '/features'], weight: 0.1 },
  { pages: ['/', '/features', '/pricing'], weight: 0.08 },

  // Developers in the docs
  { pages: ['/docs', '/docs/quickstart'], weight: 0.08 },
  { pages: ['/docs/quickstart', '/docs/authentication', '/docs/webhooks'], weight: 0.06 },
  { pages: ['/docs/api-reference'], weight: 0.05 },

  // Blog readers
  { pages: ['/blog/ach-payouts-are-live'], weight: 0.05 },
  { pages: ['/blog/how-northgate-studio-closes-books-in-a-day'], weight: 0.04 },

  // Returning users
  { pages: ['/login'], weight: 0.08 },

  // Bounces
  { pages: ['/'], weight: 0.08 },
  { pages: ['/pricing'], weight: 0.05 },

  // Sales conversations
  { pages: ['/', '/demo'], weight: 0.03 },
];

export const saasCustomEvents: CustomEventConfig[] = [
  {
    name: 'signup_started',
    weight: 0.6,
    pages: ['/signup'],
    data: {
      plan: ['starter', 'growth', 'scale'],
    },
  },
  {
    name: 'signup_completed',
    weight: 0.3,
    pages: ['/signup'],
    data: {
      plan: ['starter', 'growth', 'scale'],
      method: ['email', 'google', 'github'],
    },
  },
  {
    name: 'purchase',
    weight: 0.15,
    pages: ['/signup', '/pricing'],
    data: {
      plan: ['starter', 'growth', 'scale'],
      billing: ['monthly', 'annual'],
      revenue: [39, 89, 349],
      currency: ['USD'],
    },
  },
  {
    name: 'demo_requested',
    weight: 0.5,
    pages: ['/demo'],
    data: {
      company_size: ['1-10', '11-50', '51-200', '200+'],
    },
  },
  {
    name: 'feature_viewed',
    weight: 0.3,
    pages: ['/features'],
    data: {
      feature: ['invoicing', 'usage_billing', 'payouts', 'dunning', 'revenue_reports'],
    },
  },
  {
    name: 'cta_click',
    weight: 0.15,
    pages: ['/', '/features', '/pricing'],
    data: {
      button: ['hero_trial', 'nav_trial', 'pricing_cta', 'footer_cta'],
    },
  },
  {
    name: 'docs_search',
    weight: 0.2,
    pages: ['/docs', ...docsSections.map(s => `/docs/${s}`)],
    data: {
      query_type: ['api', 'setup', 'webhooks', 'troubleshooting'],
    },
  },
];

export const saasRevenueConfigs: RevenueConfig[] = [
  {
    eventName: 'purchase',
    minAmount: 39,
    maxAmount: 39,
    currency: 'USD',
    weight: 0.62, // Starter
  },
  {
    eventName: 'purchase',
    minAmount: 89,
    maxAmount: 89,
    currency: 'USD',
    weight: 0.28, // Growth
  },
  {
    eventName: 'purchase',
    minAmount: 349,
    maxAmount: 349,
    currency: 'USD',
    weight: 0.1, // Scale
  },
];

// A developer-facing product: launch threads, dev communities, and search ads on
// competitor and category terms.
export const saasReferrers: ReferrerMix = {
  social: [
    { domain: 'x.com', path: null },
    { domain: 'linkedin.com', path: '/feed' },
    { domain: 'news.ycombinator.com', path: '/item' },
    { domain: 'reddit.com', path: '/r/SaaS' },
    { domain: 'bsky.app', path: null },
  ],
  referral: [
    { domain: 'producthunt.com', path: '/posts/clearloom' },
    { domain: 'dev.to', path: '/post' },
    { domain: 'stackoverflow.com', path: '/questions' },
    { domain: 'github.com', path: '/clearloom/clearloom-node' },
    { domain: 'indiehackers.com', path: '/post' },
  ],
  paid: [
    { source: 'google', medium: 'cpc', campaign: 'billing_api', useGclid: true },
    { source: 'google', medium: 'cpc', campaign: 'brand_search', useGclid: true },
    { source: 'linkedin', medium: 'cpc', campaign: 'finance_ops' },
  ],
  email: [
    { source: 'newsletter', medium: 'email', campaign: 'changelog' },
    { source: 'lifecycle', medium: 'email', campaign: 'trial_day_7' },
    { source: 'partner', medium: 'referral', campaign: 'integration_launch' },
  ],
};

export const saasSessionProperties: Record<string, string[] | number[]> = {
  plan: ['starter', 'growth', 'scale'],
  role: ['developer', 'finance', 'founder', 'operations'],
  company_size: ['1-10', '11-50', '51-200', '200+'],
  seats: [1, 3, 5, 10, 25],
};

export function getSaasSiteConfig(): SiteConfig {
  return {
    hostname: SAAS_WEBSITE_DOMAIN,
    pages: saasPages,
    journeys: saasJourneys,
    customEvents: saasCustomEvents,
    referrers: saasReferrers,
    sessionProperties: saasSessionProperties,
  };
}

export function getSaasJourney(): string[] {
  const journeyWeights: WeightedOption<string[]>[] = saasJourneys.map(j => ({
    value: j.pages,
    weight: j.weight,
  }));

  return weightedRandom(journeyWeights);
}

export const SAAS_SESSIONS_PER_DAY = 500;
