import type { DeviceType } from './devices.js';

export interface WebVitals {
  lcp: number;
  inp: number;
  cls: number;
  fcp: number;
  ttfb: number;
}

interface VitalsProfile {
  lcp: number;
  inp: number;
  cls: number;
  fcp: number;
  ttfb: number;
}

/** Median field values per device class, in milliseconds (CLS is unitless). */
const MEDIANS: Record<DeviceType, VitalsProfile> = {
  desktop: { lcp: 1500, inp: 90, cls: 0.03, fcp: 950, ttfb: 380 },
  mobile: { lcp: 2400, inp: 165, cls: 0.07, fcp: 1600, ttfb: 620 },
  tablet: { lcp: 2000, inp: 130, cls: 0.05, fcp: 1300, ttfb: 520 },
};

/** Spread of the log-normal tail for each metric. */
const SIGMA: VitalsProfile = { lcp: 0.45, inp: 0.55, cls: 0.9, fcp: 0.42, ttfb: 0.5 };

/** Box-Muller transform. */
function gaussian(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function logNormal(median: number, sigma: number): number {
  return median * Math.exp(sigma * gaussian());
}

/**
 * Stable per-page weight so the performance breakdown has consistently fast and
 * consistently slow pages rather than uniform noise.
 */
function pageWeight(urlPath: string): number {
  let hash = 0;
  for (let i = 0; i < urlPath.length; i++) {
    hash = (Math.imul(hash, 31) + urlPath.charCodeAt(i)) | 0;
  }
  return 0.82 + ((hash >>> 0) % 1000) / 1000 / 1.9;
}

export function generateWebVitals(device: DeviceType, urlPath: string): WebVitals {
  const medians = MEDIANS[device] ?? MEDIANS.desktop;
  const weight = pageWeight(urlPath);

  // Composed so the metrics stay ordered (ttfb < fcp < lcp) while each one keeps
  // the median it is configured with.
  const ttfb = logNormal(medians.ttfb * weight, SIGMA.ttfb);
  const fcp = ttfb + logNormal((medians.fcp - medians.ttfb) * weight, SIGMA.fcp);
  const lcp = fcp + logNormal((medians.lcp - medians.fcp) * weight, SIGMA.lcp);

  return {
    lcp: Math.round(lcp * 10) / 10,
    inp: Math.round(logNormal(medians.inp * weight, SIGMA.inp) * 10) / 10,
    cls: Math.round(logNormal(medians.cls * weight, SIGMA.cls) * 10000) / 10000,
    fcp: Math.round(fcp * 10) / 10,
    ttfb: Math.round(ttfb * 10) / 10,
  };
}
