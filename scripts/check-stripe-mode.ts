import { eq } from 'drizzle-orm';
import { db } from '@/core/db';
import { config } from '@/config/db/schema';

async function checkStripeMode() {
  try {
    console.log('Checking Stripe configuration mode...\n');

    // Get configs from database directly
    const configResults = await db().select().from(config);
    const configs: Record<string, string> = {};
    for (const cfg of configResults) {
      configs[cfg.name] = cfg.value || '';
    }

    const stripeSecretKey = configs.stripe_secret_key;
    const stripePublishableKey = configs.stripe_publishable_key;

    if (!stripeSecretKey) {
      console.error('❌ Stripe secret key not configured');
      return;
    }

    // Check if keys are test or live mode
    const secretKeyMode = stripeSecretKey.startsWith('sk_test_') ? 'TEST' : 
                         stripeSecretKey.startsWith('sk_live_') ? 'LIVE' : 'UNKNOWN';
    
    const publishableKeyMode = stripePublishableKey?.startsWith('pk_test_') ? 'TEST' : 
                              stripePublishableKey?.startsWith('pk_live_') ? 'LIVE' : 'UNKNOWN';

    console.log('Stripe Configuration:');
    console.log(`Secret Key Mode: ${secretKeyMode}`);
    console.log(`Secret Key: ${stripeSecretKey.substring(0, 20)}...`);
    console.log('');
    console.log(`Publishable Key Mode: ${publishableKeyMode}`);
    console.log(`Publishable Key: ${stripePublishableKey?.substring(0, 20)}...`);
    console.log('');

    if (secretKeyMode !== publishableKeyMode) {
      console.log('⚠️  WARNING: Secret key and publishable key are in different modes!');
    }

    console.log('\n📝 Note:');
    console.log('- Promotion codes created in TEST mode can only be used with TEST mode keys');
    console.log('- Promotion codes created in LIVE mode can only be used with LIVE mode keys');
    console.log('- Check your Stripe dashboard to ensure you are in the correct mode when creating promotion codes');
    console.log('- Toggle between test/live mode in the top-left corner of Stripe dashboard');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkStripeMode();
