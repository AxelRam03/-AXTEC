/**
 * Pushes src/data/pricing_rules.json into Postgres.
 * Only needed when DATABASE_URL is set (production / Cloud SQL).
 * In local JSON mode the file already IS the data store, so this is a no-op.
 *
 * Usage:  npm run seed
 */
require('dotenv').config();
const rules = require('../src/data/pricing_rules.json');
const db = require('../src/services/db');

async function main() {
  if (!db.usingPostgres) {
    console.log('DATABASE_URL is not set — local JSON store is already seeded (src/data/pricing_rules.json). Nothing to do.');
    return;
  }
  for (const rule of rules) {
    await db.upsertPricingRule(rule);
    console.log('Seeded rule:', rule.id);
  }
  console.log(`Done. Seeded ${rules.length} pricing rules into Postgres.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
