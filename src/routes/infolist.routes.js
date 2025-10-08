import express from 'express';
import { 
  getAllData, 
  getDataById, 
  getDataByEmail, 
  getStatistics, 
  deleteDataById 
} from '../controllers/infolist.controller.js';

const router = express.Router();

// GET endpoints to retrieve data
router.get('/data', getAllData);
router.get('/data/:id', getDataById);
router.get('/data/email/:email', getDataByEmail);
router.get('/statistics', getStatistics);

// DELETE endpoints
router.delete('/data/:id', deleteDataById);

export default router;
