import express from 'express';
import webhookRoutes from './webhook.routes.js';
import infolistRoutes from './infolist.routes.js';

const router = express.Router();

// Mount all routes
router.use('/growmeorganic', webhookRoutes);
router.use('/infolist', infolistRoutes);

export default router;
