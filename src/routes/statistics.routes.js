import express from 'express';
import {
    getOverallStatistics,
    getListStatistics,
    getTemplateStatistics,
    getAllListsStatistics,
    getAllTemplatesStatistics,
    getDashboardStatistics
} from '../controllers/statistics.controller.js';

const router = express.Router();

// Get overall statistics
router.get('/overall', getOverallStatistics);

// Get statistics for all lists
router.get('/lists', getAllListsStatistics);

// Get statistics for all templates
router.get('/templates', getAllTemplatesStatistics);

// Get statistics for individual list
router.get('/list/:listName', getListStatistics);

// Get statistics for individual template
router.get('/template/:templateId', getTemplateStatistics);

// Get comprehensive dashboard statistics
router.get('/dashboard', getDashboardStatistics);

export default router;
