import type { ReferrerMix } from '../distributions/referrers.js';
import type {
  CustomEventConfig,
  JourneyConfig,
  PageConfig,
  SiteConfig,
} from '../generators/events.js';
import type { RevenueConfig } from '../generators/revenue.js';
import { type WeightedOption, weightedRandom } from '../utils.js';

export const SHOP_WEBSITE_NAME = 'Dayshift Coffee';
export const SHOP_WEBSITE_DOMAIN = 'dayshiftcoffee.com';

const collections = ['espresso', 'single-origin', 'blends', 'decaf', 'brew-gear'];

const products = [
  'dayshift-house-blend',
  'ember-espresso',
  'ethiopia-guji-natural',
  'colombia-huila-washed',
  'sumatra-lintong-dark-roast',
  'swiss-water-decaf',
  'gooseneck-kettle',
  'ceramic-pour-over-dripper',
];

export const shopPages: PageConfig[] = [
  {
    path: '/',
    title: 'Dayshift Coffee — Roasted to order, shipped Tuesdays',
    weight: 0.2,
    avgTimeOnPage: 35,
  },
  { path: '/search', title: 'Search', weight: 0.06, avgTimeOnPage: 40 },
  { path: '/subscribe', title: 'Coffee Subscription', weight: 0.05, avgTimeOnPage: 85 },
  { path: '/cart', title: 'Your Cart', weight: 0.08, avgTimeOnPage: 55 },
  { path: '/checkout', title: 'Checkout', weight: 0.05, avgTimeOnPage: 110 },
  { path: '/order-confirmation', title: 'Order Confirmed', weight: 0.03, avgTimeOnPage: 25 },
  { path: '/shipping-returns', title: 'Shipping & Returns', weight: 0.03, avgTimeOnPage: 70 },
  { path: '/account/orders', title: 'Your Orders', weight: 0.03, avgTimeOnPage: 45 },
  ...collections.map(slug => ({
    path: `/collections/${slug}`,
    title: `${slug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')}`,
    weight: 0.04,
    avgTimeOnPage: 65,
  })),
  ...products.map(slug => ({
    path: `/products/${slug}`,
    title: slug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    weight: 0.03,
    avgTimeOnPage: 95,
  })),
];

export const shopJourneys: JourneyConfig[] = [
  // Completed purchases
  {
    pages: [
      '/',
      '/collections/single-origin',
      '/products/ethiopia-guji-natural',
      '/cart',
      '/checkout',
      '/order-confirmation',
    ],
    weight: 0.05,
  },
  {
    pages: [
      '/collections/espresso',
      '/products/ember-espresso',
      '/cart',
      '/checkout',
      '/order-confirmation',
    ],
    weight: 0.04,
  },
  {
    pages: [
      '/search',
      '/products/dayshift-house-blend',
      '/cart',
      '/checkout',
      '/order-confirmation',
    ],
    weight: 0.03,
  },

  // Subscriptions
  { pages: ['/', '/subscribe', '/checkout', '/order-confirmation'], weight: 0.03 },
  { pages: ['/subscribe'], weight: 0.04 },

  // Abandoned carts
  { pages: ['/', '/collections/blends', '/products/dayshift-house-blend', '/cart'], weight: 0.07 },
  { pages: ['/products/gooseneck-kettle', '/cart', '/checkout'], weight: 0.05 },

  // Browsing
  { pages: ['/', '/collections/espresso'], weight: 0.1 },
  { pages: ['/', '/collections/single-origin', '/products/colombia-huila-washed'], weight: 0.09 },
  { pages: ['/collections/brew-gear', '/products/ceramic-pour-over-dripper'], weight: 0.06 },
  { pages: ['/search', '/collections/decaf'], weight: 0.05 },
  { pages: ['/products/sumatra-lintong-dark-roast'], weight: 0.06 },

  // Bounces and support
  { pages: ['/'], weight: 0.13 },
  { pages: ['/collections/decaf'], weight: 0.05 },
  { pages: ['/shipping-returns'], weight: 0.04 },
  { pages: ['/account/orders'], weight: 0.05 },
];

export const shopCustomEvents: CustomEventConfig[] = [
  {
    name: 'product_view',
    weight: 0.85,
    pages: products.map(slug => `/products/${slug}`),
    data: {
      product: products,
      price: [17, 19, 22, 24, 26, 42, 68],
    },
  },
  {
    name: 'add_to_cart',
    weight: 0.35,
    pages: products.map(slug => `/products/${slug}`),
    data: {
      product: products,
      grind: ['whole-bean', 'espresso', 'filter', 'french-press'],
      bag_size: ['250g', '500g', '1kg'],
      quantity: [1, 1, 1, 2, 3],
    },
  },
  {
    name: 'search',
    weight: 0.7,
    pages: ['/search'],
    data: {
      term: ['decaf', 'espresso beans', 'ethiopia', 'cold brew', 'gift card', 'kettle', 'returns'],
    },
  },
  {
    name: 'subscription_started',
    weight: 0.3,
    pages: ['/subscribe'],
    data: {
      frequency: ['weekly', 'biweekly', 'monthly'],
      bags: [1, 1, 2, 3],
    },
  },
  {
    name: 'begin_checkout',
    weight: 0.55,
    pages: ['/checkout'],
    data: {
      payment_method: ['card', 'paypal', 'apple_pay', 'shop_pay'],
      items: [1, 2, 3, 4],
    },
  },
  {
    name: 'purchase',
    weight: 0.9,
    pages: ['/order-confirmation'],
    data: {
      shipping: ['standard', 'express', 'local_pickup'],
      coupon: ['none', 'none', 'FIRSTBAG10', 'SHIPSFREE'],
      items: [1, 2, 3, 4],
    },
  },
  {
    name: 'newsletter_signup',
    weight: 0.05,
    pages: ['/', '/collections/blends'],
  },
  {
    name: 'brew_guide_open',
    weight: 0.12,
    pages: products.map(slug => `/products/${slug}`),
  },
];

export const shopRevenueConfigs: RevenueConfig[] = [
  { eventName: 'purchase', minAmount: 17, maxAmount: 44, currency: 'USD', weight: 0.45 },
  { eventName: 'purchase', minAmount: 44, maxAmount: 96, currency: 'USD', weight: 0.28 },
  { eventName: 'purchase', minAmount: 96, maxAmount: 210, currency: 'USD', weight: 0.09 },
  { eventName: 'purchase', minAmount: 20, maxAmount: 90, currency: 'EUR', weight: 0.13 },
  { eventName: 'purchase', minAmount: 18, maxAmount: 82, currency: 'GBP', weight: 0.05 },
];

// Retail traffic: social discovery, coffee press and gift guides, and prospecting
// and retargeting on the ad platforms a small roaster actually buys.
export const shopReferrers: ReferrerMix = {
  social: [
    { domain: 'instagram.com', path: null },
    { domain: 'tiktok.com', path: null },
    { domain: 'pinterest.com', path: '/pin' },
    { domain: 'facebook.com', path: null },
    { domain: 'reddit.com', path: '/r/coffee' },
  ],
  referral: [
    { domain: 'sprudge.com', path: '/roaster-profile' },
    { domain: 'coffeegeek.com', path: '/reviews' },
    { domain: 'flipboard.com', path: '/topic/coffee' },
    { domain: 'substack.com', path: '/p/gift-guide' },
  ],
  paid: [
    { source: 'google', medium: 'cpc', campaign: 'shopping_beans', useGclid: true },
    {
      source: 'meta',
      medium: 'paid_social',
      campaign: 'subscription_prospecting',
      useFbclid: true,
    },
    { source: 'meta', medium: 'paid_social', campaign: 'cart_retargeting', useFbclid: true },
    { source: 'pinterest', medium: 'paid_social', campaign: 'holiday_gifting' },
  ],
  email: [
    { source: 'klaviyo', medium: 'email', campaign: 'new_arrival' },
    { source: 'klaviyo', medium: 'email', campaign: 'abandoned_cart' },
    { source: 'klaviyo', medium: 'sms', campaign: 'restock_alert' },
  ],
};

export const shopSessionProperties: Record<string, string[] | number[]> = {
  customer_type: ['new', 'returning', 'subscriber'],
  roast_preference: ['light', 'medium', 'dark'],
  acquisition: ['paid_social', 'organic', 'email', 'referral'],
};

export function getShopSiteConfig(): SiteConfig {
  return {
    hostname: SHOP_WEBSITE_DOMAIN,
    pages: shopPages,
    journeys: shopJourneys,
    customEvents: shopCustomEvents,
    referrers: shopReferrers,
    sessionProperties: shopSessionProperties,
  };
}

export function getShopJourney(): string[] {
  const journeyWeights: WeightedOption<string[]>[] = shopJourneys.map(j => ({
    value: j.pages,
    weight: j.weight,
  }));

  return weightedRandom(journeyWeights);
}

export const SHOP_SESSIONS_PER_DAY = 240;
