import { pickRandom, type WeightedOption, weightedRandom } from '../utils.js';

export type DeviceType = 'desktop' | 'mobile' | 'tablet';

const deviceWeights: WeightedOption<DeviceType>[] = [
  { value: 'desktop', weight: 0.55 },
  { value: 'mobile', weight: 0.4 },
  { value: 'tablet', weight: 0.05 },
];

// Browsers are chosen per operating system, not per device class: Samsung Internet
// does not exist on iOS, and Safari does not exist on Windows.
const browsersByOs: Record<string, WeightedOption<string>[]> = {
  'Windows 10': [
    { value: 'Chrome', weight: 0.66 },
    { value: 'Edge', weight: 0.18 },
    { value: 'Firefox', weight: 0.11 },
    { value: 'Opera', weight: 0.05 },
  ],
  'Windows 11': [
    { value: 'Chrome', weight: 0.62 },
    { value: 'Edge', weight: 0.24 },
    { value: 'Firefox', weight: 0.1 },
    { value: 'Opera', weight: 0.04 },
  ],
  'Mac OS': [
    { value: 'Safari', weight: 0.45 },
    { value: 'Chrome', weight: 0.44 },
    { value: 'Firefox', weight: 0.07 },
    { value: 'Edge', weight: 0.04 },
  ],
  Linux: [
    { value: 'Chrome', weight: 0.58 },
    { value: 'Firefox', weight: 0.34 },
    { value: 'Edge', weight: 0.05 },
    { value: 'Opera', weight: 0.03 },
  ],
  'Chrome OS': [{ value: 'Chrome', weight: 1 }],
  iOS: [
    { value: 'Safari', weight: 0.64 },
    { value: 'Chrome', weight: 0.28 },
    { value: 'Firefox', weight: 0.04 },
    { value: 'Edge', weight: 0.02 },
    { value: 'Opera', weight: 0.02 },
  ],
  Android: [
    { value: 'Chrome', weight: 0.71 },
    { value: 'Samsung', weight: 0.17 },
    { value: 'Firefox', weight: 0.05 },
    { value: 'Opera', weight: 0.04 },
    { value: 'Edge', weight: 0.03 },
  ],
};

const osByDevice: Record<DeviceType, WeightedOption<string>[]> = {
  desktop: [
    { value: 'Windows 10', weight: 0.5 },
    { value: 'Mac OS', weight: 0.3 },
    { value: 'Linux', weight: 0.12 },
    { value: 'Chrome OS', weight: 0.05 },
    { value: 'Windows 11', weight: 0.03 },
  ],
  mobile: [
    { value: 'iOS', weight: 0.45 },
    { value: 'Android', weight: 0.55 },
  ],
  tablet: [
    { value: 'iOS', weight: 0.75 },
    { value: 'Android', weight: 0.25 },
  ],
};

const screensByDevice: Record<DeviceType, string[]> = {
  desktop: [
    '1920x1080',
    '2560x1440',
    '1366x768',
    '1440x900',
    '3840x2160',
    '1536x864',
    '1680x1050',
    '2560x1080',
  ],
  mobile: ['390x844', '414x896', '375x812', '360x800', '428x926', '393x873', '412x915', '360x780'],
  tablet: ['1024x768', '768x1024', '834x1194', '820x1180', '810x1080', '800x1280'],
};

export interface DeviceInfo {
  device: DeviceType;
  browser: string;
  os: string;
  screen: string;
}

export function getRandomDevice(): DeviceInfo {
  const device = weightedRandom(deviceWeights);
  const os = weightedRandom(osByDevice[device]);
  const browser = weightedRandom(browsersByOs[os]);
  const screen = pickRandom(screensByDevice[device]);

  return { device, browser, os, screen };
}
