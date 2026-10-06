import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MAKE_WEBHOOK_URL =
  process.env.MAKE_WEBHOOK_URL ||
  'https://hook.eu1.make.com/54f2glq4ljhftfdhn0ch8e3s1j6mwb34';

// In-memory idempotency set on the server
const serverIdempotencyCache = new Set<string>();

app.use(express.json());

/**
 * Server-side proxy for Make.com webhook
 * Ensures secrets are never exposed on the client and prevents CORS issues.
 * Implements retry handling and idempotency.
 */
app.post('/api/webhooks/order-created', async (req: Request, res: Response): Promise<void> => {
  const { eventId, orderId, eventType } = req.body || {};

  if (!eventId || !orderId) {
    res.status(400).json({ error: 'Missing required eventId or orderId' });
    return;
  }

  // Server-side idempotency guard
  if (serverIdempotencyCache.has(eventId)) {
    console.log(`[Server Make.com Proxy] Idempotency: Event ${eventId} already dispatched. Returning cached success.`);
    res.status(200).json({
      success: true,
      eventId,
      status: 'ALREADY_DISPATCHED',
      message: 'Idempotent skip: webhook already delivered for this order event.',
    });
    return;
  }

  console.log(`[Server Make.com Proxy] Forwarding ${eventType} for order ${orderId} (eventId: ${eventId}) to Make.com...`);

  // Retry handling with exponential backoff (retries on network errors or 5xx)
  const maxRetries = 3;
  let lastError: any = null;
  let lastStatus = 0;
  let responseText = '';
  let delivered = false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LocalMarket-Automation/1.0',
        },
        body: JSON.stringify(req.body),
      });

      lastStatus = response.status;
      responseText = await response.text();

      // 2xx indicates scenario ran or accepted
      if (response.ok) {
        delivered = true;
        console.log(`[Server Make.com Proxy] Successfully delivered to Make.com on attempt ${attempt}: ${responseText}`);
        break;
      }

      // 410 is Make.com's response when the webhook exists but scenario is not currently active
      if (response.status === 410) {
        console.log(`[Server Make.com Proxy] Webhook reached Make.com (410: ${responseText}). No retry needed.`);
        delivered = true;
        break;
      }

      console.warn(`[Server Make.com Proxy] Make.com returned ${response.status} on attempt ${attempt}: ${responseText}`);
    } catch (err: any) {
      lastError = err;
      console.warn(`[Server Make.com Proxy] Network error on attempt ${attempt}:`, err?.message || err);
    }

    if (attempt < maxRetries) {
      const backoffMs = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  if (delivered) {
    serverIdempotencyCache.add(eventId);
    res.status(200).json({
      success: true,
      eventId,
      makeStatus: lastStatus,
      status: lastStatus === 410 ? 'REACHED_MAKE_SCENARIO_INACTIVE' : 'DELIVERED',
      message:
        lastStatus === 410
          ? 'Webhook successfully reached Make.com (Notice: Scenario in Make.com is currently paused/listening for activation)'
          : 'Order created webhook successfully accepted by Make.com',
    });
  } else {
    res.status(502).json({
      success: false,
      eventId,
      error: 'Failed to deliver webhook to Make.com after retries',
      details: lastError?.message || responseText || 'Upstream response not OK',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile('index.html', { root: 'dist' });
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`LocalMarket server running on port ${PORT}`);
  });
}

startServer();
