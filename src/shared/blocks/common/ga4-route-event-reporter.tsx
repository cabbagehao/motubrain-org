'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { markGaSessionEvent, trackGaEvent } from '@/shared/lib/ga4';

const TRACKING_QUERY_KEYS = [
  'ga_event',
  'ga_txn_id',
  'ga_currency',
  'ga_value',
  'ga_provider',
  'ga_item_id',
  'ga_item_name',
  'ga_item_category',
];

function cleanupTrackingParams() {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  let changed = false;

  for (const key of TRACKING_QUERY_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  if (changed) {
    window.history.replaceState({}, '', url.toString());
  }
}

export function Ga4RouteEventReporter() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const eventName = searchParams.get('ga_event');
    if (eventName !== 'purchase') {
      return;
    }

    const transactionId = searchParams.get('ga_txn_id');
    if (!transactionId) {
      cleanupTrackingParams();
      return;
    }

    const eventKey = `ga4:${eventName}:${transactionId}`;
    if (!markGaSessionEvent(eventKey)) {
      cleanupTrackingParams();
      return;
    }

    const currency = searchParams.get('ga_currency') || undefined;
    const valueRaw = searchParams.get('ga_value');
    const value = valueRaw ? Number(valueRaw) : undefined;
    const provider = searchParams.get('ga_provider') || undefined;
    const itemId = searchParams.get('ga_item_id') || undefined;
    const itemName = searchParams.get('ga_item_name') || undefined;
    const itemCategory = searchParams.get('ga_item_category') || undefined;

    trackGaEvent('purchase', {
      transaction_id: transactionId,
      currency,
      value:
        typeof value === 'number' && !Number.isNaN(value) ? value : undefined,
      provider,
      items: itemId
        ? [
            {
              item_id: itemId,
              item_name: itemName,
              item_category: itemCategory,
              price:
                typeof value === 'number' && !Number.isNaN(value)
                  ? value
                  : undefined,
              quantity: 1,
            },
          ]
        : undefined,
    });

    cleanupTrackingParams();
  }, [searchParams]);

  return null;
}
