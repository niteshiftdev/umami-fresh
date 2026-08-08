const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Share of a day's traffic that starts in each hour, summing to 1.
 *
 * Shallower than a single-timezone curve on purpose: the visitor mix spans the US,
 * Europe, and Asia, so the overnight hours stay populated rather than going dark.
 */
export const HOURLY_WEIGHTS = [
  0.028, 0.024, 0.021, 0.02, 0.02, 0.022, 0.026, 0.032, 0.042, 0.051, 0.058, 0.06, 0.058, 0.06,
  0.065, 0.062, 0.058, 0.052, 0.047, 0.044, 0.042, 0.04, 0.036, 0.032,
];

const DAY_OF_WEEK_WEIGHTS = [
  0.62, // Sunday
  1.14, // Monday
  1.2, // Tuesday
  1.19, // Wednesday
  1.13, // Thursday
  1.03, // Friday
  0.69, // Saturday
];

/**
 * Month-of-year demand curve: a summer lull, a strong autumn, and a holiday dip.
 * Keeps the 6 and 12 month views from reading as a flat line.
 */
const MONTH_OF_YEAR_WEIGHTS = [
  1.05, // January
  1.02, // February
  1.06, // March
  1.0, // April
  0.97, // May
  0.9, // June
  0.83, // July
  0.85, // August
  1.09, // September
  1.14, // October
  1.12, // November
  0.88, // December
];

/** Compounding month-over-month growth, so a year ago is markedly quieter than today. */
const MONTHLY_GROWTH = 1.12;

/** Relative traffic on the day a campaign lands and on the three days after it. */
const CAMPAIGN_DECAY = [2.6, 1.85, 1.4, 1.15];

/** Roughly one campaign every this many days. */
const CAMPAIGN_INTERVAL = 47;

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function startOfNextDay(date: Date): Date {
  const result = startOfDay(date);
  result.setDate(result.getDate() + 1);
  return result;
}

/** Deterministic 32-bit hash, so campaign spikes land on the same dates in every run. */
function hashInt(value: number): number {
  let x = value | 0;
  x = Math.imul(x ^ (x >>> 16), 2246822507);
  x = Math.imul(x ^ (x >>> 13), 3266489909);
  return (x ^ (x >>> 16)) >>> 0;
}

function campaignMultiplier(day: Date): number {
  const dayNumber = Math.floor(startOfDay(day).getTime() / DAY);

  for (let offset = 0; offset < CAMPAIGN_DECAY.length; offset++) {
    if (hashInt(dayNumber - offset) % CAMPAIGN_INTERVAL === 0) {
      return CAMPAIGN_DECAY[offset];
    }
  }

  return 1;
}

/**
 * How busy a day is relative to a full-strength day today, combining long-term
 * growth, weekday rhythm, annual seasonality, and campaign spikes.
 */
export function getTrafficMultiplier(day: Date, now: Date): number {
  const daysAgo = Math.max(0, (startOfDay(now).getTime() - startOfDay(day).getTime()) / DAY);
  const growth = MONTHLY_GROWTH ** (-daysAgo / 30);

  return (
    growth *
    DAY_OF_WEEK_WEIGHTS[day.getDay()] *
    MONTH_OF_YEAR_WEIGHTS[day.getMonth()] *
    campaignMultiplier(day)
  );
}

/** Share of a single day's traffic that starts inside [from, to). */
export function windowTrafficShare(from: Date, to: Date): number {
  if (to <= from) {
    return 0;
  }

  const dayStart = startOfDay(from);
  let share = 0;

  for (let hour = 0; hour < 24; hour++) {
    const hourStart = dayStart.getTime() + hour * HOUR;
    const overlap = Math.min(to.getTime(), hourStart + HOUR) - Math.max(from.getTime(), hourStart);

    if (overlap > 0) {
      share += HOURLY_WEIGHTS[hour] * (overlap / HOUR);
    }
  }

  return share;
}

/** A timestamp inside [from, to), distributed across the hours people actually browse. */
export function generateTimestampInWindow(from: Date, to: Date): Date {
  const dayStart = startOfDay(from);
  const slots: { start: number; end: number; weight: number }[] = [];
  let totalWeight = 0;

  for (let hour = 0; hour < 24; hour++) {
    const hourStart = dayStart.getTime() + hour * HOUR;
    const start = Math.max(from.getTime(), hourStart);
    const end = Math.min(to.getTime(), hourStart + HOUR);

    if (end > start) {
      const weight = HOURLY_WEIGHTS[hour] * ((end - start) / HOUR);
      slots.push({ start, end, weight });
      totalWeight += weight;
    }
  }

  if (slots.length === 0) {
    return new Date(from);
  }

  let random = Math.random() * totalWeight;

  for (const slot of slots) {
    random -= slot.weight;
    if (random <= 0) {
      return new Date(slot.start + Math.random() * (slot.end - slot.start));
    }
  }

  const last = slots[slots.length - 1];
  return new Date(last.start + Math.random() * (last.end - last.start));
}

/**
 * Number of sessions to start inside [from, to).
 *
 * The fractional remainder is resolved probabilistically, so repeatedly topping up a
 * low-traffic site in one-minute windows still adds up to the right daily total.
 */
export function getSessionCountForWindow(
  sessionsPerDay: number,
  from: Date,
  to: Date,
  now: Date,
): number {
  const expected =
    sessionsPerDay *
    getTrafficMultiplier(from, now) *
    windowTrafficShare(from, to) *
    (0.85 + Math.random() * 0.3);

  const whole = Math.floor(expected);

  return whole + (Math.random() < expected - whole ? 1 : 0);
}
