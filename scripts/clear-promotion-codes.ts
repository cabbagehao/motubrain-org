import { eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { config } from '@/config/db/schema';

async function clearPromotionCodes() {
  try {
    console.log('Clearing stripe_promotion_codes from database...');

    // Delete the stripe_promotion_codes config
    const result = await db()
      .delete(config)
      .where(eq(config.name, 'stripe_promotion_codes'))
      .returning();

    if (result.length > 0) {
      console.log('✅ Successfully deleted stripe_promotion_codes config');
      console.log('Deleted value:', result[0].value);
    } else {
      console.log('ℹ️  No stripe_promotion_codes config found in database');
    }

    // Also check if there are any other promotion code related configs
    const allConfigs = await db()
      .select()
      .from(config)
      .where(eq(config.name, 'stripe_allow_promotion_codes'));

    if (allConfigs.length > 0) {
      console.log('\nOther promotion code configs:');
      allConfigs.forEach((c: any) => {
        console.log(`  ${c.name}: ${c.value}`);
      });
    }

    console.log('\n✅ Done! Please restart your dev server to clear the cache.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

clearPromotionCodes();
