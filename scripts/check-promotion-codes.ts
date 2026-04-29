import { eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { config } from '@/config/db/schema';

async function checkPromotionCodes() {
  try {
    console.log('Checking stripe_promotion_codes from database...\n');

    // Get the stripe_promotion_codes config
    const result = await db()
      .select()
      .from(config)
      .where(eq(config.name, 'stripe_promotion_codes'));

    if (result.length > 0) {
      console.log('✅ Found stripe_promotion_codes config:');
      console.log('Raw value:', result[0].value);
      console.log('\nParsed value:');
      if (result[0].value) {
        try {
          const parsed = JSON.parse(result[0].value);
          console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('Failed to parse JSON:', e);
        }
      } else {
        console.log('Value is null or empty');
      }
    } else {
      console.log('ℹ️  No stripe_promotion_codes config found in database');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkPromotionCodes();
