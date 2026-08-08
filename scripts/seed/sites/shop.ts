import type {
  CustomEventConfig,
  JourneyConfig,
  PageConfig,
  SiteConfig,
} from '../generators/events.js';
import type { RevenueConfig } from '../generators/revenue.js';
import { type WeightedOption, weightedRandom } from '../utils.js';

export const SHOP_WEBSITE_NAME = 'Demo Store';
export const SHOP_WEBSITE_DOMAIN = 'shop.example.com';

const collections = ['outerwear', 'footwear', 'accessories', 'new-arrivals', 'sale'];

const products = [
  'alpine-shell-jacket',
  'merino-crew-sweater',
  'trail-runner-gtx',
  'canvas-weekender',
  'wool-beanie',
  'rain-shell-pants',
  'leather-belt',
  'thermal-base-layer',
];

export const shopPages: PageConfig[] = [
  { path: '/', title: 'Demo Store - Gear for Everywhere', weight: 0.2, avgTimeOnPage: 35 },
  { path: '/search', title: 'Search Results', weight: 0.06, avgTimeOnPage: 40 },
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
      .join(' ')} Collection`,
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
      '/collections/new-arrivals',
      '/products/alpine-shell-jacket',
      '/cart',
      '/checkout',
      '/order-confirmation',
    ],
    weight: 0.05,
  },
  {
    pages: [
      '/collections/footwear',
      '/products/trail-runner-gtx',
      '/cart',
      '/checkout',
      '/order-confirmation',
    ],
    weight: 0.04,
  },
  {
    pages: [
      '/search',
      '/products/merino-crew-sweater',
      '/cart',
      '/checkout',
      '/order-confirmation',
    ],
    weight: 0.03,
  },

  // Abandoned carts
  { pages: ['/', '/collections/sale', '/products/rain-shell-pants', '/cart'], weight: 0.07 },
  { pages: ['/products/canvas-weekender', '/cart', '/checkout'], weight: 0.05 },

  // Browsing
  { pages: ['/', '/collections/outerwear'], weight: 0.12 },
  { pages: ['/', '/collections/new-arrivals', '/products/wool-beanie'], weight: 0.09 },
  { pages: ['/collections/accessories', '/products/leather-belt'], weight: 0.07 },
  { pages: ['/search', '/collections/footwear'], weight: 0.06 },
  { pages: ['/products/thermal-base-layer'], weight: 0.06 },

  // Bounces and support
  { pages: ['/'], weight: 0.13 },
  { pages: ['/collections/sale'], weight: 0.07 },
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
      price: [39, 59, 89, 129, 189, 249],
    },
  },
  {
    name: 'add_to_cart',
    weight: 0.35,
    pages: products.map(slug => `/products/${slug}`),
    data: {
      product: products,
      size: ['xs', 's', 'm', 'l', 'xl'],
      quantity: [1, 1, 1, 2, 3],
    },
  },
  {
    name: 'search',
    weight: 0.7,
    pages: ['/search'],
    data: {
      term: ['jacket', 'boots', 'gore-tex', 'wool', 'sale', 'gift card', 'returns'],
    },
  },
  {
    name: 'begin_checkout',
    weight: 0.55,
    pages: ['/checkout'],
    data: {
      payment_method: ['card', 'paypal', 'apple_pay', 'klarna'],
      items: [1, 2, 3, 4],
    },
  },
  {
    name: 'purchase',
    weight: 0.9,
    pages: ['/order-confirmation'],
    data: {
      shipping: ['standard', 'express', 'pickup'],
      coupon: ['none', 'none', 'WELCOME10', 'FREESHIP'],
      items: [1, 2, 3, 4],
    },
  },
  {
    name: 'newsletter_signup',
    weight: 0.05,
    pages: ['/', '/collections/sale'],
  },
  {
    name: 'size_guide_open',
    weight: 0.12,
    pages: products.map(slug => `/products/${slug}`),
  },
];

export const shopRevenueConfigs: RevenueConfig[] = [
  { eventName: 'purchase', minAmount: 24, maxAmount: 95, currency: 'USD', weight: 0.45 },
  { eventName: 'purchase', minAmount: 95, maxAmount: 260, currency: 'USD', weight: 0.28 },
  { eventName: 'purchase', minAmount: 260, maxAmount: 640, currency: 'USD', weight: 0.09 },
  { eventName: 'purchase', minAmount: 30, maxAmount: 240, currency: 'EUR', weight: 0.13 },
  { eventName: 'purchase', minAmount: 28, maxAmount: 220, currency: 'GBP', weight: 0.05 },
];

export const shopSessionProperties: Record<string, string[] | number[]> = {
  customer_type: ['new', 'returning', 'vip'],
  loyalty_tier: ['none', 'silver', 'gold'],
  acquisition: ['paid_social', 'organic', 'email', 'referral'],
};

export function getShopSiteConfig(): SiteConfig {
  return {
    hostname: SHOP_WEBSITE_DOMAIN,
    pages: shopPages,
    journeys: shopJourneys,
    customEvents: shopCustomEvents,
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
