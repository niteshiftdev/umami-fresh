#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Umami Sample Data Generator
 *
 * Generates realistic analytics data for local development and testing.
 * Creates three demo websites:
 *   - Demo Blog:  Low traffic, content-led
 *   - Demo SaaS:  High traffic, signup funnel and subscription revenue
 *   - Demo Store: Mid traffic, product/cart/checkout funnel and multi-currency revenue
 *
 * Runs are incremental: a site that already exists is topped up from its most recent
 * event to the present instead of being regenerated, so repeated runs keep the
 * dashboard current without duplicating anything.
 *
 * Usage:
 *   npm run seed-data                    # Backfill 400 days, then top up to now
 *   npm run seed-data -- --days 90       # Backfill 90 days instead
 *   npm run seed-data -- --clear         # Delete existing demo data first
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
  --clear              Delete existing demo data before generating
  --live               Stay running and top up to the present on an interval
  --interval <secs>    Seconds between live top-ups (default: ${DEFAULT_LIVE_INTERVAL})
  --verbose, -v        Show detailed progress
  --help, -h           Show this help message

Examples:
  npm run seed-data                     # Backfill 400 days, then top up to now
  npm run seed-data -- --days 90        # Backfill 90 days instead
  npm run seed-data -- --clear          # Start from scratch
  npm run seed-data -- --live           # Keep the demo current while the app runs

Generated sites:
  - Demo Blog:  Low traffic, content-led
  - Demo SaaS:  High traffic, signup funnel and subscription revenue
  - Demo Store: Mid traffic, checkout funnel and multi-currency revenue

The default backfill covers every range the date picker offers, up to "last 12
months" and "this year". Existing sites are topped up rather than regenerated.

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
