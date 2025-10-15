import express from 'express';
import { handleGrowmeWebhook } from '../controllers/growme_webhook.controller.js';

const router = express.Router();

// Webhook-specific logging middleware
router.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🚀 WEBHOOK ROUTE ACCESSED 🚀`);
  console.log(`[${timestamp}] Route: ${req.method} ${req.originalUrl}`);
  console.log(`Base URL: ${req.baseUrl}`);
  console.log(`Path: ${req.path}`);
  console.log(`Route matched: /growmeorganic${req.path}`);
  console.log(`===== WEBHOOK ROUTE LOG =====\n`);
  next();
});

// Webhook endpoint for Growme Organic
router.post('/webhook', handleGrowmeWebhook);

// Health check endpoint for webhook
router.get('/webhook/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Growme Organic webhook is healthy',
    timestamp: new Date().toISOString(),
    status: 'operational',
    location_filter: 'Dubai only',
    endpoints: {
      webhook: '/api/v1/growmeorganic/webhook',
      health: '/api/v1/growmeorganic/webhook/health'
    }
  });
});

export default router;
