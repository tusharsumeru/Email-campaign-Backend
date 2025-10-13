import express from 'express';
import webhookRoutes from './webhook.routes.js';
import infolistRoutes from './infolist.routes.js';
import baseUrlRoutes from './base_url.routes.js';
import emailTemplateRoutes from './email_template.routes.js';
import emailSendRoutes from './email_send.routes.js';
import statisticsRoutes from './statistics.routes.js';

const router = express.Router();

// Mount all routes
router.use('/growmeorganic', webhookRoutes);
router.use('/infolist', infolistRoutes);
router.use('/baseurl', baseUrlRoutes);
router.use('/email-templates', emailTemplateRoutes);
router.use('/email-send', emailSendRoutes);
router.use('/statistics', statisticsRoutes);

export default router;
