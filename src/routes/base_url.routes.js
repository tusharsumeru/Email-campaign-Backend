import express from 'express';
import { createBaseUrl, getBaseUrl } from '../controllers/base_url.controller.js';

const router = express.Router();

// Base URL routes
router.post('/', createBaseUrl);
router.get('/', getBaseUrl);

export default router;
