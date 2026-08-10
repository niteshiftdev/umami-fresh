#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Umami Sample Data Generator
 *
 * Generates realistic analytics data for local development and testing.
 * Creates three websites that read like real properties rather than placeholders:
 *   - Cedar & Salt:    cedarandsalt.com, low traffic, recipes and newsletter signups
 *   - Clearloom:       clearloom.com, high traffic, trial funnel and subscription revenue
 *   - Dayshift Coffee: dayshiftcoffee.com, mid traffic, checkout funnel and multi-currency revenue
 *
 * Runs are incremental: a site that already exists is topped up from its most recent
 * event to the present instead of being regenerated, so repeated runs keep the
 * dashboard current without duplicating anything.
 *
 * Usage:
 *   npm run seed-data                    # Backfill 30 days, then top up to now
 *   npm run seed-data -- --days 400      # Backfill a longer window instead
 *   npm run seed-data -- --clear         # Delete existing seeded sites first
 *   npm run seed-data -- --live          # Keep topping up every 60 seconds
 *   npm run seed-data -- --verbose       # Show detailed progress
 */

import { DEFAULT_BACKFILL_DAYS, type SeedConfig, seed, seedLive } from './seed/index.js';

const DEFAULT_LIVE_INTERVAL = 60;

interface CliConfig extends SeedConfig {
  live: boolean;
  interval: number;
}

function parsePositiveInt(value: string, flag: string): number {
  const parsed = parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    console.error(`Error: ${flag} must be a positive integer`);
    process.exit(1);
  }

  return parsed;
}

function parseArgs(): CliConfig {
  const args = process.argv.slice(2);

  const config: CliConfig = {
    days: DEFAULT_BACKFILL_DAYS,
    clear: false,
    verbose: false,
    live: false,
    interval: DEFAULT_LIVE_INTERVAL,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--days' && args[i + 1]) {
      config.days = parsePositiveInt(args[++i], '--days');
    } else if (arg.startsWith('--days=')) {
      config.days = parsePositiveInt(arg.split('=')[1], '--days');
    } else if (arg === '--interval' && args[i + 1]) {
      config.interval = parsePositiveInt(args[++i], '--interval');
    } else if (arg.startsWith('--interval=')) {
      config.interval = parsePositiveInt(arg.split('=')[1], '--interval');
    } else if (arg === '--clear') {
      config.clear = true;
    } else if (arg === '--live') {
      config.live = true;
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return config;
}

function printHelp(): void {
  console.log(`
Umami Sample Data Generator

Generates realistic analytics data for local development and testing.

Usage:
  npm run seed-data [options]

Options:
  --days <number>      Days of history to backfill a new site (default: ${DEFAULT_BACKFILL_DAYS})
  --clear              Delete existing seeded sites before generating
  --live               Stay running and top up to the present on an interval
  --interval <secs>    Seconds between live top-ups (default: ${DEFAULT_LIVE_INTERVAL})
  --verbose, -v        Show detailed progress
  --help, -h           Show this help message

Examples:
  npm run seed-data                     # Backfill 30 days, then top up to now
  npm run seed-data -- --days 400       # Backfill a longer window instead
  npm run seed-data -- --clear          # Start from scratch
  npm run seed-data -- --live           # Keep the demo current while the app runs

Generated sites:
  - Cedar & Salt (cedarandsalt.com):       Low traffic, recipes and newsletter signups
  - Clearloom (clearloom.com):             High traffic, trial funnel and subscriptions
  - Dayshift Coffee (dayshiftcoffee.com):  Mid traffic, checkout and multi-currency revenue

The default backfill covers the day, week, and month ranges the dashboard opens on;
raise --days for the 6 and 12 month views. Existing sites are topped up rather than
regenerated, and a top-up never redoes more than the backfill window.

Stop any running --live seeder before using --clear, or it will start backfilling
the sites again as soon as it notices they are gone.

Note:
  This script is blocked from running in production environments
  (NODE_ENV=production or cloud platforms like Vercel/Netlify/Railway).
`);
}

function checkEnvironment(): void {
  const nodeEnv = process.env.NODE_ENV;

  if (nodeEnv === 'production') {
    console.error('\nError: seed-data cannot run in production environment.');
    console.error('This script is only for local development and testing.\n');
    process.exit(1);
  }

  if (process.env.VERCEL || process.env.NETLIFY || process.env.RAILWAY_ENVIRONMENT) {
    console.error('\nError: seed-data cannot run in cloud environments.');
    console.error('This script is only for local development and testing.\n');
    process.exit(1);
  }
}

async function main(): Promise<void> {
  console.log('\nUmami Sample Data Generator\n');

  checkEnvironment();

  const config = parseArgs();

  try {
    if (config.live) {
      await seedLive(config, config.interval);
    } else {
      await seed(config);
    }
  } catch (error) {
    console.error('\nError generating seed data:', error);
    process.exit(1);
  }
}

main();
