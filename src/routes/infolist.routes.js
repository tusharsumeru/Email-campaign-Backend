import express from 'express';
import { 
  getAllData, 
  getDataById, 
  getDataByEmail, 
  getStatistics, 
  getEmailStatus,
  deleteDataById 
} from '../controllers/infolist.controller.js';

const router = express.Router();

// GET endpoints to retrieve data
router.get('/data', getAllData);
router.get('/data/:id', getDataById);
router.get('/data/email/:email', getDataByEmail);
router.get('/statistics', getStatistics);
router.get('/email-status/:id', getEmailStatus);

// DELETE endpoints
router.delete('/data/:id', deleteDataById);

export default router;
