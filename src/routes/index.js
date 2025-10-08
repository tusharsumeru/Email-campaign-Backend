import express from 'express';
import webhookRoutes from './webhook.routes.js';
import infolistRoutes from './infolist.routes.js';
import baseUrlRoutes from './base_url.routes.js';

const router = express.Router();

// Mount all routes
router.use('/growmeorganic', webhookRoutes);
router.use('/infolist', infolistRoutes);
router.use('/baseurl', baseUrlRoutes);

export default router;
