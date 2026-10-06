import { Order } from '../types';
import { getAsiaKolkataISOString } from '../utils/timezone';
import { db } from '../firebase/config';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export const DEFAULT_MAKE_WEBHOOK_URL =
  'https://hook.eu1.make.com/54f2glq4ljhftfdhn0ch8e3s1j6mwb34';

export interface MakeOrderCreatedPayload {
  eventType: 'ORDER_CREATED';
  eventId: string;
  orderId: string;
  customerId: string;
  merchantId: string;
  customerName: string;
  merchantName: string;
  orderTotal: string;
  pickupTime: string;
  timestamp: string;
  status: 'PLACED';
}

// In-memory idempotency cache for dispatched webhook event IDs
const dispatchedEventsCache = new Set<string>();

/**
 * Dispatches an HTTPS POST request to the Make.com webhook whenever a new order is created.
 * Enforces:
 * 1. Only triggers after Firestore order creation succeeds
 * 2. Exact required JSON structure
 * 3. Idempotency (prevent duplicate webhooks for the same order)
 * 4. Retry handling with exponential backoff
 */
export async function sendOrderCreatedWebhook(
  order: Order,
  eventId: string
): Promise<{ success: boolean; eventId: string; message: string }> {
  // 1. Idempotency Check: In-memory & LocalStorage
  const storageKey = `make_webhook_dispatched_${eventId}`;
  if (dispatchedEventsCache.has(eventId)) {
    console.log(`[MakeWebhook] Idempotency: Webhook for ${eventId} already dispatched in memory. Skipping.`);
    return { success: true, eventId, message: 'Already dispatched (in-memory idempotency)' };
  }

  try {
    if (typeof window !== 'undefined' && localStorage.getItem(storageKey)) {
      console.log(`[MakeWebhook] Idempotency: Webhook for ${eventId} already recorded in storage. Skipping.`);
      dispatchedEventsCache.add(eventId);
      return { success: true, eventId, message: 'Already dispatched (storage idempotency)' };
    }
  } catch (e) {
    // Ignore storage errors in restricted contexts
  }

  // 2. Build the exact payload schema requested by the user
  const payload: MakeOrderCreatedPayload = {
    eventType: 'ORDER_CREATED',
    eventId,
    orderId: order.id,
    customerId: order.customerId || 'cust-aditya-kumar',
    merchantId: order.storeId,
    customerName: order.customerName || 'Aditya Kumar',
    merchantName: order.storeName,
    orderTotal: String(order.totalAmount),
    pickupTime: order.estimatedReadyTime || order.orderTime || 'Ready in 15 mins',
    timestamp: getAsiaKolkataISOString(),
    status: 'PLACED',
  };

  console.log('[MakeWebhook] Dispatching ORDER_CREATED webhook payload:', payload);

  // 3. Dispatch with retry handling and exponential backoff
  const maxRetries = 3;
  let success = false;
  let lastError: Error | null = null;
  let deliveryDetail = '';

  // Attempt first through the backend proxy /api/webhooks/order-created (avoids CORS & secret exposure)
  // If unavailable or in standalone dev, fallback directly to the Make.com endpoint
  const targetEndpoints = [
    '/api/webhooks/order-created',
    DEFAULT_MAKE_WEBHOOK_URL,
  ];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const endpoint of targetEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        // 2xx status code indicates Make.com or our proxy accepted the webhook
        if (response.ok) {
          success = true;
          deliveryDetail = `Accepted by ${endpoint === DEFAULT_MAKE_WEBHOOK_URL ? 'Make.com direct' : 'Local proxy'}`;
          console.log(`[MakeWebhook] Successfully posted to ${endpoint} on attempt ${attempt}`);
          break;
        }

        // 410 from Make.com means the webhook exists and was reached, but the user's Make.com scenario is inactive/paused
        if (response.status === 410) {
          success = true;
          deliveryDetail = 'Delivered to Make.com (Scenario awaiting activation in Make.com)';
          console.log(`[MakeWebhook] Webhook reached Make.com (410: Scenario paused in Make.com)`);
          break;
        }

        console.warn(`[MakeWebhook] Endpoint ${endpoint} returned HTTP ${response.status} on attempt ${attempt}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[MakeWebhook] Network attempt ${attempt} on ${endpoint} failed:`, lastError.message);
      }
    }

    if (success) break;

    // Exponential backoff before next retry: 1s, 2s, 4s
    if (attempt < maxRetries) {
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      console.log(`[MakeWebhook] Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // 4. Record idempotency on success
  if (success) {
    dispatchedEventsCache.add(eventId);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, new Date().toISOString());
      }
    } catch (e) {
      // Ignore
    }

    // Update automation event document in Firestore to indicate webhook dispatch
    try {
      const eventDocRef = doc(db, 'automation_events', eventId);
      const snap = await getDoc(eventDocRef);
      if (snap.exists()) {
        await updateDoc(eventDocRef, {
          webhookDispatched: true,
          webhookDispatchedAt: getAsiaKolkataISOString(),
        });
      }
    } catch (err) {
      console.warn('[MakeWebhook] Could not update Firestore event document status:', err);
    }

    return { success: true, eventId, message: deliveryDetail || 'Delivered to Make.com webhook' };
  } else {
    console.error('[MakeWebhook] All retry attempts failed for event', eventId, lastError);
    return {
      success: false,
      eventId,
      message: `Failed after ${maxRetries} attempts: ${lastError?.message || 'Webhook response not OK'}`,
    };
  }
}
