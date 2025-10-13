import EmailTemplate from "../models/email_template.model.js";

// Helper function to extract placeholders from content
const extractPlaceholders = (content) => {
    const placeholders = [];
    
    // Match {$variable} format
    const dollarPlaceholderRegex = /\{\$([^}]+)\}/g;
    let match;
    
    while ((match = dollarPlaceholderRegex.exec(content)) !== null) {
        const placeholder = `{$${match[1].trim()}}`;
        if (!placeholders.includes(placeholder)) {
            placeholders.push(placeholder);
        }
    }
    
    // Match {{variable}} format
    const doubleBraceRegex = /\{\{([^}]+)\}\}/g;
    while ((match = doubleBraceRegex.exec(content)) !== null) {
        const placeholder = `{{${match[1].trim()}}}`;
        if (!placeholders.includes(placeholder)) {
            placeholders.push(placeholder);
        }
    }
    
    return placeholders;
};

export const createEmailTemplate = async (req, res) => {
    try {
        const { name, subject, slug, content, category } = req.body;
        
        if (!name || !subject || !slug || !content || !category) {
            return res.status(400).json({ 
                message: 'Name, subject, slug, content, and category are required' 
            });
        }

        // Extract placeholders from content and subject
        const contentPlaceholders = extractPlaceholders(content);
        const subjectPlaceholders = extractPlaceholders(subject);
        const allPlaceholders = [...new Set([...contentPlaceholders, ...subjectPlaceholders])];

        const emailTemplate = new EmailTemplate({
            name,
            subject,
            slug,
            content,
            category,
            tags: allPlaceholders // Store placeholders in tags field
        });

        await emailTemplate.save();
        return res.status(201).json({
            message: 'Email template created successfully',
            template: emailTemplate,
            availablePlaceholders: allPlaceholders
        });
    } catch (error) {
        console.error('Error creating email template:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Template with this slug already exists' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getEmailTemplates = async (req, res) => {
    try {
        const { category, isActive, slug, tags } = req.query;
        
        let filter = {};
        if (category) filter.category = category;
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        if (slug) filter.slug = slug;
        if (tags) filter.tags = { $in: tags.split(',') };

        const templates = await EmailTemplate.find(filter).sort({ createdAt: -1 });
        
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

export const getEmailTemplateById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const template = await EmailTemplate.findById(id);
        if (!template) {
            return res.status(404).json({ message: 'Email template not found' });
        }
        
        return res.status(200).json({
            message: 'Email template retrieved successfully',
            template
        });
    } catch (error) {
        console.error('Error fetching email template:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateEmailTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        // If content or subject is being updated, extract placeholders
        if (updateData.content || updateData.subject) {
            const currentTemplate = await EmailTemplate.findById(id);
            if (!currentTemplate) {
                return res.status(404).json({ message: 'Email template not found' });
            }
            
            const content = updateData.content || currentTemplate.content;
            const subject = updateData.subject || currentTemplate.subject;
            
            const contentPlaceholders = extractPlaceholders(content);
            const subjectPlaceholders = extractPlaceholders(subject);
            const allPlaceholders = [...new Set([...contentPlaceholders, ...subjectPlaceholders])];
            
            updateData.tags = allPlaceholders;
        }
        
        const template = await EmailTemplate.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true, runValidators: true }
        );
        
        if (!template) {
            return res.status(404).json({ message: 'Email template not found' });
        }
        
        return res.status(200).json({
            message: 'Email template updated successfully',
            template,
            availablePlaceholders: template.tags
        });
    } catch (error) {
        console.error('Error updating email template:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteEmailTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        
        const template = await EmailTemplate.findByIdAndDelete(id);
        if (!template) {
            return res.status(404).json({ message: 'Email template not found' });
        }
        
        return res.status(200).json({
            message: 'Email template deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting email template:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
