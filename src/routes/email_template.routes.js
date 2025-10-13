import express from 'express';
import { 
    createEmailTemplate, 
    getEmailTemplates, 
    getEmailTemplateById, 
    updateEmailTemplate, 
    deleteEmailTemplate 
} from '../controllers/email_template.controller.js';

const router = express.Router();

// Email template routes
router.post('/', createEmailTemplate);
router.get('/', getEmailTemplates);
router.get('/:id', getEmailTemplateById);
router.put('/:id', updateEmailTemplate);
router.delete('/:id', deleteEmailTemplate);

export default router;
