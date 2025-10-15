import EmailTemplate from "../models/email_template.model.js";
import BaseUrl from "../models/base_url.model.js";
import InfoList from "../models/info_list.model.js";
import EmailStatus from "../models/email_status.model.js";
import nodemailer from 'nodemailer';

// Helper function to replace placeholders in content
const replacePlaceholders = (content, placeholders) => {
    console.log('🔍 [PLACEHOLDER REPLACEMENT] Starting placeholder replacement...');
    console.log('📝 [PLACEHOLDER REPLACEMENT] Original content:', content);
    console.log('📊 [PLACEHOLDER REPLACEMENT] Available placeholders:', Object.keys(placeholders));
    console.log('💾 [PLACEHOLDER REPLACEMENT] Placeholder values:', placeholders);
    
    let replacedContent = content;
    
    Object.keys(placeholders).forEach(key => {
        const value = placeholders[key] || '';
        console.log(`🔄 [PLACEHOLDER REPLACEMENT] Processing: ${key} = "${value}"`);
        
        // Replace {$variable} format
        const dollarPlaceholder = `{\\$${key}}`;
        const dollarMatches = replacedContent.match(new RegExp(dollarPlaceholder, 'g'));
        if (dollarMatches) {
            console.log(`✅ [PLACEHOLDER REPLACEMENT] Found ${dollarMatches.length} ${dollarPlaceholder} matches`);
        }
        replacedContent = replacedContent.replace(new RegExp(dollarPlaceholder, 'g'), value);
        
        // Replace {{variable}} format
        const doubleBracePlaceholder = `\\{\\{${key}\\}\\}`;
        const doubleBraceMatches = replacedContent.match(new RegExp(doubleBracePlaceholder, 'g'));
        if (doubleBraceMatches) {
            console.log(`✅ [PLACEHOLDER REPLACEMENT] Found ${doubleBraceMatches.length} ${doubleBracePlaceholder} matches`);
        }
        replacedContent = replacedContent.replace(new RegExp(doubleBracePlaceholder, 'g'), value);
    });
    
    console.log('✨ [PLACEHOLDER REPLACEMENT] Final replaced content:', replacedContent);
    return replacedContent;
};

// Get all email templates
export const getEmailTemplates = async (req, res) => {
    try {
        const templates = await EmailTemplate.find({ isActive: true });
        
        return res.status(200).json({
            message: 'Email templates retrieved successfully',
            count: templates.length,
            templates
        });
    } catch (error) {
        console.error('Error fetching email templates:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Send individual email


// Send email with template preview (for testing)
export const sendEmailPreview = async (req, res) => {
    try {
        const { templateId, placeholders } = req.body;
        
        if (!templateId) {
            return res.status(400).json({ 
                message: 'Template ID is required' 
            });
        }

        // Get the email template
        const template = await EmailTemplate.findById(templateId);
        if (!template) {
            return res.status(404).json({ message: 'Email template not found' });
        }

        // Replace placeholders in subject and content
        const processedSubject = replacePlaceholders(template.subject, placeholders || {});
        const processedContent = replacePlaceholders(template.content, placeholders || {});

        return res.status(200).json({
            message: 'Email preview generated successfully',
            preview: {
                subject: processedSubject,
                content: processedContent,
                availablePlaceholders: template.tags
            }
        });

    } catch (error) {
        console.error('Error generating email preview:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Send individual email
export const sendIndividualEmail = async (req, res) => {
    try {
        const { templateId, recipientEmail, placeholders } = req.body;
        
        if (!templateId || !recipientEmail) {
            return res.status(400).json({ 
                message: 'Template ID and recipient email are required' 
            });
        }

        // Get the email template
        const template = await EmailTemplate.findById(templateId);
        if (!template) {
            return res.status(404).json({ message: 'Email template not found' });
        }

        // Find or create email status for the recipient
        let infoListUser = await InfoList.findOne({ email_first: recipientEmail });
        if (!infoListUser) {
            return res.status(404).json({ message: 'Recipient not found in info list' });
        }

        // Replace placeholders in subject and content
        const processedSubject = replacePlaceholders(template.subject, placeholders || {});
        const processedContent = replacePlaceholders(template.content, placeholders || {});

        // Create nodemailer transporter for Amazon SES
        const transporter = nodemailer.createTransport({
            host: process.env.ACCOUNT_SMTP_HOST,
            port: process.env.ACCOUNT_SMTP_PORT,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.ACCOUNT_EMAIL,
                pass: process.env.ACCOUNT_PASS
            }
        });

        // Send email
        const mailOptions = {
            from: process.env.FROM_EMAIL,
            to: recipientEmail,
            subject: processedSubject,
            html: processedContent
        };

        const result = await transporter.sendMail(mailOptions);
        
        // Update email status
        let emailStatus = await EmailStatus.findByInfoListUserId(infoListUser._id);
        if (!emailStatus) {
            emailStatus = new EmailStatus({
                infolist_user_id: infoListUser._id,
                email_status_object: {}
            });
        }

        await emailStatus.updateEmailStatus(
            templateId, 
            template.templateName, 
            template.templateSlug, 
            'individual', 
            result.messageId
        );

        // Update info list user
        infoListUser.mailsent = true;
        infoListUser.sent_template_id = templateId;
        infoListUser.email_status_id = emailStatus._id;
        await infoListUser.save();

        return res.status(200).json({
            message: 'Email sent successfully',
            messageId: result.messageId,
            recipient: recipientEmail,
            template: {
                id: templateId,
                name: template.templateName
            }
        });

    } catch (error) {
        console.error('Error sending individual email:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Send bulk emails
export const sendBulkEmails = async (req, res) => {
    try {
        const { templateId, listName, placeholders, subject, content } = req.body;
        
        // Validate required fields
        if (!templateId) {
            return res.status(400).json({ 
                success: false,
                message: 'Template ID is required',
                field: 'templateId'
            });
        }
        
        if (!listName) {
            return res.status(400).json({ 
                success: false,
                message: 'List name is required',
                field: 'listName'
            });
        }
        
        // Validate placeholders is an object
        if (placeholders && typeof placeholders !== 'object') {
            return res.status(400).json({ 
                success: false,
                message: 'Placeholders must be an object',
                field: 'placeholders'
            });
        }

        // Get the email template
        const template = await EmailTemplate.findById(templateId);
        if (!template) {
            return res.status(404).json({ message: 'Email template not found' });
        }

        // Get recipients from the specified list (remove mailsent filter for bulk campaigns)
        const recipients = await InfoList.find({ 
            list_name: listName
        });

        if (recipients.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'No recipients found in the specified list',
                listName: listName
            });
        }

        // Create nodemailer transporter for Amazon SES
        const transporter = nodemailer.createTransport({
            host: process.env.ACCOUNT_SMTP_HOST,
            port: process.env.ACCOUNT_SMTP_PORT,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.ACCOUNT_EMAIL,
                pass: process.env.ACCOUNT_PASS
            }
        });

        const results = [];
        const errors = [];

        // Process each recipient
        for (const recipient of recipients) {
            try {
                // Replace placeholders with recipient-specific data
                const recipientPlaceholders = {
                    ...placeholders,
                    // Basic info
                    full_name: recipient.full_name || '',
                    first_name: recipient.first_name || '',
                    middle_name: recipient.middle_name || '',
                    last_name: recipient.last_name || '',
                    name: recipient.full_name || '',
                    
                    // Email addresses
                    email_first: recipient.email_first || '',
                    email_second: recipient.email_second || '',
                    email: recipient.email_first || '',
                    
                    // Contact info
                    phone: recipient.phone || '',
                    company_phone: recipient.company_phone || '',
                    url: recipient.url || '',
                    
                    // Job info
                    job_title: recipient.job_title || '',
                    company_name: recipient.company_name || '',
                    company_domain: recipient.company_domain || '',
                    company_id: recipient.company_id || '',
                    company: recipient.company_name || '',
                    
                    // Location
                    city: recipient.city || '',
                    
                    // LinkedIn
                    linkedin_id: recipient.linkedin_id || '',
                    
                    // List info
                    list_name: recipient.list_name || ''
                };

                // Debug: Log placeholder mapping for first few recipients
                if (results.length < 3) {
                    console.log(`📧 [PLACEHOLDER DEBUG] Recipient: ${recipient.email_first}`);
                    console.log(`📧 [PLACEHOLDER DEBUG] Available placeholders:`, Object.keys(recipientPlaceholders));
                    console.log(`📧 [PLACEHOLDER DEBUG] Sample values:`, {
                        full_name: recipientPlaceholders.full_name,
                        email: recipientPlaceholders.email,
                        company: recipientPlaceholders.company,
                        job_title: recipientPlaceholders.job_title,
                        city: recipientPlaceholders.city
                    });
                }

                const processedSubject = replacePlaceholders(template.subject, recipientPlaceholders);
                const processedContent = replacePlaceholders(template.content, recipientPlaceholders);

                // Send email
                const mailOptions = {
                    from: process.env.FROM_EMAIL,
                    to: recipient.email_first,
                    subject: processedSubject,
                    html: processedContent
                };

                const result = await transporter.sendMail(mailOptions);
                
                // Update email status
                let emailStatus = await EmailStatus.findByInfoListUserId(recipient._id);
                if (!emailStatus) {
                    emailStatus = new EmailStatus({
                        infolist_user_id: recipient._id,
                        email_status_object: {}
                    });
                }

                await emailStatus.updateEmailStatus(
                    templateId, 
                    template.templateName, 
                    template.templateSlug, 
                    'bulk', 
                    result.messageId
                );

                // Update recipient status
                recipient.mailsent = true;
                recipient.sent_template_id = templateId;
                recipient.email_status_id = emailStatus._id;
                await recipient.save();

                results.push({
                    recipient: recipient.email_first,
                    messageId: result.messageId,
                    status: 'sent'
                });

            } catch (error) {
                console.error(`Error sending email to ${recipient.email_first}:`, error);
                errors.push({
                    recipient: recipient.email_first,
                    error: error.message
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Bulk email sending completed',
            data: {
                totalRecipients: recipients.length,
                successful: results.length,
                failed: errors.length,
                results,
                errors
            }
        });

    } catch (error) {
        console.error('Error sending bulk emails:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Get email templates with their send counts
export const getEmailTemplatesWithCounts = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Get email status for the user
        const emailStatus = await EmailStatus.findByInfoListUserId(userId);
        
        if (!emailStatus) {
            return res.status(200).json({
                message: 'No email status found for this user',
                templates: []
            });
        }

        // Get templates with counts
        const templatesWithCounts = emailStatus.getTemplatesWithCounts();

        return res.status(200).json({
            message: 'Email templates with counts retrieved successfully',
            templates: templatesWithCounts
        });

    } catch (error) {
        console.error('Error getting email templates with counts:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

