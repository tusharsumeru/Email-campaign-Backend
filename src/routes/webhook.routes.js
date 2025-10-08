import express from 'express';
import { handleGrowmeWebhook } from '../controllers/growme_webhook.controller.js';

const router = express.Router();

// Webhook endpoint for Growme Organic
router.post('/growmeorganic/webhook', handleGrowmeWebhook);

// Health check endpoint for webhook
router.get('/growmeorganic/webhook/health', (req, res) => {
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
