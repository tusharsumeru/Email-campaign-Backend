import express from 'express';
import { 
    getEmailTemplates,
    sendIndividualEmail, 
    sendBulkEmails,
    sendEmailPreview,
    getEmailTemplatesWithCounts
} from '../controllers/email_send.controller.js';

const router = express.Router();

// Email sending routes
router.get('/templates', getEmailTemplates);
router.get('/templates/counts/:userId', getEmailTemplatesWithCounts);
router.post('/preview', sendEmailPreview);
router.post('/individual', sendIndividualEmail);
router.post('/bulk', sendBulkEmails);

export default router;
