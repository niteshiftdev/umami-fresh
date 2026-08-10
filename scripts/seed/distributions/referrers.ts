import { pickRandom, randomInt, type WeightedOption, weightedRandom } from '../utils.js';

export type ReferrerType = 'direct' | 'organic' | 'social' | 'paid' | 'referral';

export interface ReferrerInfo {
  type: ReferrerType;
  domain: string | null;
  path: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  gclid: string | null;
  fbclid: string | null;
}

const referrerTypeWeights: WeightedOption<ReferrerType>[] = [
  { value: 'direct', weight: 0.4 },
  { value: 'organic', weight: 0.25 },
  { value: 'social', weight: 0.15 },
  { value: 'paid', weight: 0.1 },
  { value: 'referral', weight: 0.1 },
];

const searchEngines = [
  { domain: 'google.com', path: '/search' },
  { domain: 'bing.com', path: '/search' },
  { domain: 'duckduckgo.com', path: '/' },
  { domain: 'yahoo.com', path: '/search' },
  { domain: 'baidu.com', path: '/s' },
];

/** A site or platform that sends traffic, as it appears in the referrer header. */
export interface ReferrerSource {
  domain: string;
  path: string | null;
}

export interface PaidCampaign {
  source: string;
  medium: string;
  campaign: string;
  useGclid?: boolean;
  useFbclid?: boolean;
}

export interface EmailCampaign {
  source: string;
  medium: string;
  campaign: string;
}

/**
 * Where a site's traffic comes from when it is not search or direct.
 *
 * Each site supplies its own mix, so a coffee subscription is not being written up
 * on Hacker News and a billing API is not trending on Pinterest.
 */
export interface ReferrerMix {
  social?: ReferrerSource[];
  referral?: ReferrerSource[];
  paid?: PaidCampaign[];
  email?: EmailCampaign[];
}

const DEFAULT_SOCIAL: ReferrerSource[] = [
  { domain: 'facebook.com', path: null },
  { domain: 'instagram.com', path: null },
  { domain: 'x.com', path: null },
  { domain: 'reddit.com', path: '/r/all' },
];

const DEFAULT_REFERRAL: ReferrerSource[] = [
  { domain: 'flipboard.com', path: '/topic' },
  { domain: 'substack.com', path: '/p/roundup' },
  { domain: 'feedly.com', path: '/i/latest' },
];

const DEFAULT_PAID: PaidCampaign[] = [
  { source: 'google', medium: 'cpc', campaign: 'brand_search', useGclid: true },
  { source: 'facebook', medium: 'paid_social', campaign: 'retargeting', useFbclid: true },
];

const DEFAULT_EMAIL: EmailCampaign[] = [
  { source: 'newsletter', medium: 'email', campaign: 'weekly' },
];

function generateClickId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getRandomReferrer(mix: ReferrerMix = {}): ReferrerInfo {
  const type = weightedRandom(referrerTypeWeights);
  const socialPlatforms = mix.social ?? DEFAULT_SOCIAL;
  const referralSites = mix.referral ?? DEFAULT_REFERRAL;
  const paidCampaigns = mix.paid ?? DEFAULT_PAID;
  const emailCampaigns = mix.email ?? DEFAULT_EMAIL;

  const result: ReferrerInfo = {
    type,
    domain: null,
    path: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    gclid: null,
    fbclid: null,
  };

  switch (type) {
    case 'direct':
      // No referrer data
      break;

    case 'organic': {
      const engine = pickRandom(searchEngines);
      result.domain = engine.domain;
      result.path = engine.path;
      break;
    }

    case 'social': {
      const platform = pickRandom(socialPlatforms);
      result.domain = platform.domain;
      result.path = platform.path;

      // Some social traffic has UTM params
      if (Math.random() < 0.3) {
        result.utmSource = platform.domain.replace('.com', '').replace('.net', '');
        result.utmMedium = 'social';
      }
      break;
    }

    case 'paid': {
      const campaign = pickRandom(paidCampaigns);
      result.utmSource = campaign.source;
      result.utmMedium = campaign.medium;
      result.utmCampaign = campaign.campaign;
      result.utmContent = `ad_${randomInt(1, 5)}`;

      if (campaign.useGclid) {
        result.gclid = generateClickId();
        result.domain = 'google.com';
        result.path = '/search';
      } else if (campaign.useFbclid) {
        result.fbclid = generateClickId();
        result.domain = 'facebook.com';
        result.path = null;
      }
      break;
    }

    case 'referral': {
      // Mix of pure referrals and email campaigns
      if (Math.random() < 0.6) {
        const site = pickRandom(referralSites);
        result.domain = site.domain;
        result.path = site.path;
      } else {
        const campaign = pickRandom(emailCampaigns);
        result.utmSource = campaign.source;
        result.utmMedium = campaign.medium;
        result.utmCampaign = campaign.campaign;
      }
      break;
    }
  }

  return result;
}
