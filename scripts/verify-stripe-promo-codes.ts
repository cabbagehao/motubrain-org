import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '@/core/db';
import { config } from '@/config/db/schema';

async function verifyStripePromoCodes() {
  try {
    console.log('Verifying Stripe promotion codes...\n');

    // Get configs from database directly
    const configResults = await db().select().from(config);
    const configs: Record<string, string> = {};
    for (const cfg of configResults) {
      configs[cfg.name] = cfg.value || '';
    }

    const stripeSecretKey = configs.stripe_secret_key;
    const stripePromotionCodes = configs.stripe_promotion_codes;

    if (!stripeSecretKey) {
      console.error('❌ Stripe secret key not configured');
      return;
    }

    if (!stripePromotionCodes) {
      console.error('❌ No promotion codes configured');
      return;
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Parse promotion codes
    const promotionCodes = JSON.parse(stripePromotionCodes);
    console.log('Configured promotion codes:');
    console.log(JSON.stringify(promotionCodes, null, 2));
    console.log('\n');

    // Verify each promotion code
    for (const [productId, promoCodeId] of Object.entries(promotionCodes)) {
      console.log(`Checking ${productId}: ${promoCodeId}`);
      
      try {
        const promoCode = await stripe.promotionCodes.retrieve(promoCodeId as string);
        console.log(`✅ Valid promotion code`);
        console.log(`   - Code: ${promoCode.code}`);
        console.log(`   - Active: ${promoCode.active}`);
        console.log(`   - Coupon ID: ${typeof promoCode.coupon === 'string' ? promoCode.coupon : promoCode.coupon.id}`);
        
        if (typeof promoCode.coupon !== 'string') {
          console.log(`   - Discount: ${promoCode.coupon.percent_off ? promoCode.coupon.percent_off + '%' : promoCode.coupon.amount_off + ' ' + promoCode.coupon.currency}`);
        }
      } catch (error: any) {
        console.log(`❌ Invalid promotion code: ${error.message}`);
      }
      console.log('');
    }

    console.log('✅ Verification complete!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

verifyStripePromoCodes();
