import type { ReferrerMix } from '../distributions/referrers.js';
import type {
  CustomEventConfig,
  JourneyConfig,
  PageConfig,
  SiteConfig,
} from '../generators/events.js';
import { type WeightedOption, weightedRandom } from '../utils.js';

export const BLOG_WEBSITE_NAME = 'Cedar & Salt';
export const BLOG_WEBSITE_DOMAIN = 'cedarandsalt.com';

const recipes = [
  { slug: 'no-knead-focaccia', title: 'No-Knead Focaccia, Start to Finish' },
  { slug: 'weeknight-white-bean-stew', title: 'The White Bean Stew I Make Every Week' },
  { slug: 'sheet-pan-chicken-thighs', title: 'Sheet Pan Chicken Thighs with Winter Citrus' },
  { slug: 'house-vinaigrette', title: 'The Only Vinaigrette You Need' },
  { slug: 'preserving-summer-tomatoes', title: 'Two Ways to Keep August Tomatoes' },
  { slug: 'sourdough-discard-crackers', title: 'Sourdough Discard Crackers' },
  { slug: 'braised-short-ribs', title: 'Sunday Short Ribs, Braised Slow' },
  { slug: 'oaxaca-market-notes', title: 'Notes from a Week of Market Eating in Oaxaca' },
];

export const blogPages: PageConfig[] = [
  { path: '/', title: 'Cedar & Salt', weight: 0.25, avgTimeOnPage: 30 },
  { path: '/recipes', title: 'All Recipes', weight: 0.2, avgTimeOnPage: 45 },
  { path: '/about', title: 'About', weight: 0.1, avgTimeOnPage: 60 },
  { path: '/contact', title: 'Say Hello', weight: 0.05, avgTimeOnPage: 45 },
  ...recipes.map(recipe => ({
    path: `/recipes/${recipe.slug}`,
    title: recipe.title,
    weight: 0.05,
    avgTimeOnPage: 180,
  })),
];

export const blogJourneys: JourneyConfig[] = [
  // Straight to a recipe from search
  { pages: ['/recipes/no-knead-focaccia'], weight: 0.15 },
  { pages: ['/recipes/weeknight-white-bean-stew'], weight: 0.12 },
  { pages: ['/recipes/sheet-pan-chicken-thighs'], weight: 0.1 },

  // Homepage bounces
  { pages: ['/'], weight: 0.15 },

  // Homepage to the recipe index
  { pages: ['/', '/recipes'], weight: 0.1 },

  // Homepage to a recipe
  { pages: ['/', '/recipes', '/recipes/house-vinaigrette'], weight: 0.08 },
  { pages: ['/', '/recipes', '/recipes/braised-short-ribs'], weight: 0.08 },

  // About page visits
  { pages: ['/', '/about'], weight: 0.07 },
  { pages: ['/', '/about', '/contact'], weight: 0.05 },

  // One recipe to the next
  { pages: ['/recipes/sourdough-discard-crackers', '/recipes/no-knead-focaccia'], weight: 0.05 },

  // Longer sessions
  { pages: ['/', '/recipes', '/recipes/preserving-summer-tomatoes', '/about'], weight: 0.05 },
];

export const blogCustomEvents: CustomEventConfig[] = [
  {
    name: 'newsletter_signup',
    weight: 0.03,
    pages: ['/', '/recipes'],
  },
  {
    name: 'jump_to_recipe',
    weight: 0.4,
    pages: recipes.map(recipe => `/recipes/${recipe.slug}`),
  },
  {
    name: 'print_recipe',
    weight: 0.06,
    pages: recipes.map(recipe => `/recipes/${recipe.slug}`),
  },
  {
    name: 'share_click',
    weight: 0.05,
    pages: recipes.map(recipe => `/recipes/${recipe.slug}`),
    data: {
      platform: ['pinterest', 'instagram', 'facebook', 'copy_link'],
    },
  },
  {
    name: 'scroll_depth',
    weight: 0.2,
    pages: recipes.map(recipe => `/recipes/${recipe.slug}`),
    data: {
      depth: [25, 50, 75, 100],
    },
  },
];

// Recipe traffic: saved to boards, passed around in newsletters, and picked up by
// aggregators rather than arriving from ad networks.
export const blogReferrers: ReferrerMix = {
  social: [
    { domain: 'pinterest.com', path: '/pin' },
    { domain: 'instagram.com', path: null },
    { domain: 'facebook.com', path: null },
    { domain: 'reddit.com', path: '/r/cooking' },
  ],
  referral: [
    { domain: 'flipboard.com', path: '/topic/cooking' },
    { domain: 'substack.com', path: '/p/what-were-cooking' },
    { domain: 'feedly.com', path: '/i/latest' },
    { domain: 'apple.news', path: null },
  ],
  paid: [
    { source: 'pinterest', medium: 'paid_social', campaign: 'holiday_baking' },
    { source: 'facebook', medium: 'paid_social', campaign: 'newsletter_growth', useFbclid: true },
  ],
  email: [
    { source: 'newsletter', medium: 'email', campaign: 'sunday_letter' },
    { source: 'newsletter', medium: 'email', campaign: 'holiday_menu' },
  ],
};

export const blogSessionProperties: Record<string, string[] | number[]> = {
  subscriber: ['yes', 'no'],
  interest: ['baking', 'weeknight', 'preserving', 'travel'],
};

export function getBlogSiteConfig(): SiteConfig {
  return {
    hostname: BLOG_WEBSITE_DOMAIN,
    pages: blogPages,
    journeys: blogJourneys,
    customEvents: blogCustomEvents,
    referrers: blogReferrers,
    sessionProperties: blogSessionProperties,
  };
}

export function getBlogJourney(): string[] {
  const journeyWeights: WeightedOption<string[]>[] = blogJourneys.map(j => ({
    value: j.pages,
    weight: j.weight,
  }));

  return weightedRandom(journeyWeights);
}

// Low traffic, but busy enough that the "today" and "last 24 hours" views are not empty.
export const BLOG_SESSIONS_PER_DAY = 35;
