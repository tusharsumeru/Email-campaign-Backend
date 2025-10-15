import InfoList from "../models/info_list.model.js";
import EmailTemplate from "../models/email_template.model.js";
import EmailStatus from "../models/email_status.model.js";

// Get overall statistics
export const getOverallStatistics = async (req, res) => {
    try {
        // Get total counts
        const totalLists = await InfoList.countDocuments();
        const totalTemplates = await EmailTemplate.countDocuments();
        const totalEmailStatuses = await EmailStatus.countDocuments();
        const totalEmailsSent = await InfoList.countDocuments({ mailsent: true });
        const totalEmailsNotSent = await InfoList.countDocuments({ mailsent: false });
        const activeTemplates = await EmailTemplate.countDocuments({ isActive: true });
        const inactiveTemplates = await EmailTemplate.countDocuments({ isActive: false });

        // Get unique list names count
        const uniqueListNames = await InfoList.distinct('list_name');
        const totalUniqueLists = uniqueListNames.length;

        // Get template usage statistics from EmailStatus - simplified approach
        const templateUsageStats = [];
        
        // Get all EmailStatus records
        const emailStatuses = await EmailStatus.find({});
        
        // Process each email status record
        for (const emailStatus of emailStatuses) {
            const emailStatusObject = emailStatus.email_status_object;
            
            // Process each template in the email_status_object
            for (const [templateKey, templateData] of Object.entries(emailStatusObject)) {
                if (templateData && templateData.template_id) {
                    // Find existing template in our results
                    let existingTemplate = templateUsageStats.find(t => t.templateId === templateData.template_id);
                    
                    if (!existingTemplate) {
                        // Get template details from EmailTemplate collection
                        const template = await EmailTemplate.findById(templateData.template_id);
                        
                        existingTemplate = {
                            templateId: templateData.template_id,
                            templateName: templateData.template_name,
                            templateSlug: templateData.template_slug,
                            templateCategory: template ? template.category : 'unknown',
                            usageCount: 0,
                            uniqueRecipients: 0,
                            firstSent: templateData.first_sent_date,
                            lastSent: templateData.last_sent_date
                        };
                        templateUsageStats.push(existingTemplate);
                    }
                    
                    // Update counts
                    existingTemplate.usageCount += templateData.send_count || 0;
                    existingTemplate.uniqueRecipients += 1;
                    
                    // Update dates
                    if (templateData.first_sent_date && (!existingTemplate.firstSent || templateData.first_sent_date < existingTemplate.firstSent)) {
                        existingTemplate.firstSent = templateData.first_sent_date;
                    }
                    if (templateData.last_sent_date && (!existingTemplate.lastSent || templateData.last_sent_date > existingTemplate.lastSent)) {
                        existingTemplate.lastSent = templateData.last_sent_date;
                    }
                }
            }
        }
        
        // Sort by usage count
        templateUsageStats.sort((a, b) => b.usageCount - a.usageCount);
        

        // Get total emails sent across all templates
        const totalEmailsSentCount = await EmailStatus.aggregate([
            {
                $project: {
                    totalEmails: {
                        $sum: {
                            $map: {
                                input: { $objectToArray: '$email_status_object' },
                                as: 'template',
                                in: '$$template.v.send_count'
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalEmails' }
                }
            }
        ]);

        return res.status(200).json({
            message: 'Overall statistics retrieved successfully',
            statistics: {
                lists: {
                    total: totalLists,
                    unique: totalUniqueLists,
                    uniqueListNames: uniqueListNames
                },
                emails: {
                    totalSent: totalEmailsSent,
                    totalNotSent: totalEmailsNotSent,
                    totalEmailsSentCount: totalEmailsSentCount.length > 0 ? totalEmailsSentCount[0].total : 0,
                    total: totalLists
                },
                templates: {
                    total: totalTemplates,
                    active: activeTemplates,
                    inactive: inactiveTemplates
                },
                emailStatuses: {
                    total: totalEmailStatuses
                },
                templateUsage: templateUsageStats
            }
        });

    } catch (error) {
        console.error('Error fetching overall statistics:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Get statistics for individual list
export const getListStatistics = async (req, res) => {
    try {
        const { listName } = req.params;

        if (!listName) {
            return res.status(400).json({ message: 'List name is required' });
        }

        // Get statistics for specific list
        const listStats = await InfoList.aggregate([
            { $match: { list_name: listName } },
            {
                $group: {
                    _id: null,
                    totalContacts: { $sum: 1 },
                    emailsSent: { $sum: { $cond: ['$mailsent', 1, 0] } },
                    emailsNotSent: { $sum: { $cond: ['$mailsent', 0, 1] } }
                }
            }
        ]);

        // Get template usage for this specific list using EmailStatus
        const templateUsage = await EmailStatus.aggregate([
            {
                $lookup: {
                    from: 'info_lists',
                    localField: 'infolist_user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            { $match: { 'user.list_name': listName } },
            {
                $project: {
                    templateData: {
                        $objectToArray: '$email_status_object'
                    }
                }
            },
            {
                $unwind: '$templateData'
            },
            {
                $group: {
                    _id: '$templateData.v.template_id',
                    template_name: { $first: '$templateData.v.template_name' },
                    template_slug: { $first: '$templateData.v.template_slug' },
                    total_sends: { $sum: '$templateData.v.send_count' },
                    unique_recipients: { $sum: 1 },
                    first_sent: { $min: '$templateData.v.first_sent_date' },
                    last_sent: { $max: '$templateData.v.last_sent_date' }
                }
            },
            {
                $lookup: {
                    from: 'emailtemplates',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'template'
                }
            },
            {
                $unwind: '$template'
            },
            {
                $project: {
                    templateId: '$_id',
                    templateName: '$template_name',
                    templateSlug: '$template_slug',
                    templateCategory: '$template.category',
                    usageCount: '$total_sends',
                    uniqueRecipients: '$unique_recipients',
                    firstSent: '$first_sent',
                    lastSent: '$last_sent'
                }
            },
            {
                $sort: { usageCount: -1 }
            }
        ]);

        // Get recent contacts (last 10)
        const recentContacts = await InfoList.find({ list_name: listName })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('full_name email_first company_name mailsent sent_template_id createdAt');

        const statistics = listStats.length > 0 ? listStats[0] : {
            totalContacts: 0,
            emailsSent: 0,
            emailsNotSent: 0
        };

        return res.status(200).json({
            message: `Statistics for list '${listName}' retrieved successfully`,
            listName,
            statistics: {
                totalContacts: statistics.totalContacts,
                emailsSent: statistics.emailsSent,
                emailsNotSent: statistics.emailsNotSent,
                templateUsage,
                recentContacts
            }
        });

    } catch (error) {
        console.error('Error fetching list statistics:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Get statistics for individual template
export const getTemplateStatistics = async (req, res) => {
    try {
        const { templateId } = req.params;

        if (!templateId) {
            return res.status(400).json({ message: 'Template ID is required' });
        }

        // Get template details
        const template = await EmailTemplate.findById(templateId);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        // Get usage statistics for this template from EmailStatus
        const usageStats = await EmailStatus.aggregate([
            {
                $match: { [`email_status_object.${templateId}`]: { $exists: true } }
            },
            {
                $lookup: {
                    from: 'info_lists',
                    localField: 'infolist_user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $group: {
                    _id: null,
                    totalSent: { $sum: { $ifNull: [`$email_status_object.${templateId}.send_count`, 0] } },
                    uniqueLists: { $addToSet: '$user.list_name' },
                    uniqueRecipients: { $sum: 1 }
                }
            }
        ]);

        // Get list-wise breakdown
        const listBreakdown = await EmailStatus.aggregate([
            {
                $match: { [`email_status_object.${templateId}`]: { $exists: true } }
            },
            {
                $lookup: {
                    from: 'info_lists',
                    localField: 'infolist_user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $group: {
                    _id: '$user.list_name',
                    count: { $sum: { $ifNull: [`$email_status_object.${templateId}.send_count`, 0] } },
                    recipients: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        // Get recent sends (last 10)
        const recentSends = await EmailStatus.aggregate([
            {
                $match: { [`email_status_object.${templateId}`]: { $exists: true } }
            },
            {
                $lookup: {
                    from: 'info_lists',
                    localField: 'infolist_user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    full_name: '$user.full_name',
                    email_first: '$user.email_first',
                    list_name: '$user.list_name',
                    company_name: '$user.company_name',
                    send_count: `$email_status_object.${templateId}.send_count`,
                    last_sent_date: `$email_status_object.${templateId}.last_sent_date`,
                    updatedAt: '$updatedAt'
                }
            },
            {
                $sort: { updatedAt: -1 }
            },
            {
                $limit: 10
            }
        ]);

        const statistics = usageStats.length > 0 ? usageStats[0] : {
            totalSent: 0,
            uniqueLists: [],
            uniqueRecipients: 0
        };

        return res.status(200).json({
            message: `Statistics for template '${template.name}' retrieved successfully`,
            template: {
                id: template._id,
                name: template.name,
                slug: template.slug,
                category: template.category,
                isActive: template.isActive
            },
            statistics: {
                totalSent: statistics.totalSent,
                uniqueRecipients: statistics.uniqueRecipients,
                uniqueListsCount: statistics.uniqueLists.length,
                uniqueLists: statistics.uniqueLists,
                listBreakdown,
                recentSends
            }
        });

    } catch (error) {
        console.error('Error fetching template statistics:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Get all lists with their statistics
export const getAllListsStatistics = async (req, res) => {
    try {
        const listsStats = await InfoList.aggregate([
            {
                $group: {
                    _id: '$list_name',
                    totalContacts: { $sum: 1 },
                    emailsSent: { $sum: { $cond: ['$mailsent', 1, 0] } },
                    emailsNotSent: { $sum: { $cond: ['$mailsent', 0, 1] } },
                    lastUpdated: { $max: '$updatedAt' }
                }
            },
            {
                $sort: { totalContacts: -1 }
            }
        ]);

        return res.status(200).json({
            message: 'All lists statistics retrieved successfully',
            lists: listsStats
        });

    } catch (error) {
        console.error('Error fetching all lists statistics:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Get all templates with their statistics
export const getAllTemplatesStatistics = async (req, res) => {
    try {
        // Get all templates first
        const allTemplates = await EmailTemplate.find({});
        const templatesStats = [];
        
        // Process each template
        for (const template of allTemplates) {
            let totalSent = 0;
            let uniqueRecipients = 0;
            let firstSent = null;
            let lastSent = null;
            
            // Get all EmailStatus records that use this template
            const emailStatuses = await EmailStatus.find({
                [`email_status_object.${template._id}`]: { $exists: true }
            });
            
            // Process each email status record
            for (const emailStatus of emailStatuses) {
                const templateData = emailStatus.email_status_object[template._id.toString()];
                if (templateData) {
                    totalSent += templateData.send_count || 0;
                    uniqueRecipients += 1;
                    
                    // Update dates
                    if (templateData.first_sent_date && (!firstSent || templateData.first_sent_date < firstSent)) {
                        firstSent = templateData.first_sent_date;
                    }
                    if (templateData.last_sent_date && (!lastSent || templateData.last_sent_date > lastSent)) {
                        lastSent = templateData.last_sent_date;
                    }
                }
            }
            
            templatesStats.push({
                _id: template._id,
                name: template.name,
                slug: template.slug,
                category: template.category,
                isActive: template.isActive,
                totalSent,
                uniqueRecipients,
                firstSent,
                lastSent,
                createdAt: template.createdAt,
                updatedAt: template.updatedAt
            });
        }
        
        // Sort by total sent
        templatesStats.sort((a, b) => b.totalSent - a.totalSent);

        return res.status(200).json({
            message: 'All templates statistics retrieved successfully',
            templates: templatesStats
        });

    } catch (error) {
        console.error('Error fetching all templates statistics:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Get simplified dashboard statistics
 * Returns only essential data: total mail sent, users per day, emails per day, active templates
 */
export const getDashboardStatistics = async (req, res) => {
    try {
        console.log('📊 Fetching simplified dashboard statistics...');
        
        // 1. Total mail sent across all templates
        let totalMailSent = 0;
        let uniqueRecipients = 0;
        
        const emailStatuses = await EmailStatus.find({});
        console.log(`📊 Found ${emailStatuses.length} EmailStatus records`);
        
        emailStatuses.forEach(status => {
            if (status.email_status_object && typeof status.email_status_object === 'object') {
                Object.keys(status.email_status_object).forEach(templateKey => {
                    const templateData = status.email_status_object[templateKey];
                    if (templateData && templateData.send_count) {
                        totalMailSent += templateData.send_count;
                        uniqueRecipients += 1;
                    }
                });
            }
        });
        
        // 2. Users per day (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const usersPerDay = await InfoList.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
            }
        ]);
        
        // 3. Emails sent per day (last 30 days)
        const emailsPerDay = [];
        const dayGroups = {};
        
        const emailStatusesLast30Days = await EmailStatus.find({
            createdAt: { $gte: thirtyDaysAgo }
        });
        
        emailStatusesLast30Days.forEach(status => {
            const dayKey = status.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (!dayGroups[dayKey]) {
                dayGroups[dayKey] = {
                    total_emails_sent: 0,
                    unique_recipients: 0
                };
            }
            
            if (status.email_status_object && typeof status.email_status_object === 'object') {
                Object.keys(status.email_status_object).forEach(templateKey => {
                    const templateData = status.email_status_object[templateKey];
                    if (templateData && templateData.send_count) {
                        dayGroups[dayKey].total_emails_sent += templateData.send_count;
                        dayGroups[dayKey].unique_recipients += 1;
                    }
                });
            }
        });
        
        // Convert to array format
        Object.keys(dayGroups).forEach(dayKey => {
            const [year, month, day] = dayKey.split('-');
            emailsPerDay.push({
                _id: {
                    year: parseInt(year),
                    month: parseInt(month),
                    day: parseInt(day)
                },
                total_emails_sent: dayGroups[dayKey].total_emails_sent,
                unique_recipients: dayGroups[dayKey].unique_recipients
            });
        });
        
        // Sort by date
        emailsPerDay.sort((a, b) => {
            if (a._id.year !== b._id.year) return a._id.year - b._id.year;
            if (a._id.month !== b._id.month) return a._id.month - b._id.month;
            return a._id.day - b._id.day;
        });
        
        // 4. Active email templates count (templates that have been used)
        let activeTemplatesCount = 0;
        const usedTemplateIds = new Set();
        
        emailStatuses.forEach(status => {
            if (status.email_status_object && typeof status.email_status_object === 'object') {
                Object.keys(status.email_status_object).forEach(templateKey => {
                    const templateData = status.email_status_object[templateKey];
                    if (templateData && templateData.send_count && templateData.send_count > 0) {
                        usedTemplateIds.add(templateData.template_id);
                    }
                });
            }
        });
        
        activeTemplatesCount = usedTemplateIds.size;
        
        // 5. Total templates in database
        const totalTemplatesInDB = await EmailTemplate.countDocuments({});
        
        const dashboardStats = {
            // Essential metrics only
            total_mail_sent: totalMailSent,
            users_per_day: usersPerDay,
            emails_per_day: emailsPerDay,
            active_templates: activeTemplatesCount,
            total_templates: totalTemplatesInDB
        };
        
        console.log('✅ Simplified dashboard statistics generated successfully');
        console.log(`📧 Total mail sent: ${totalMailSent}`);
        console.log(`📊 Users per day records: ${usersPerDay.length}`);
        console.log(`📧 Emails per day records: ${emailsPerDay.length}`);
        console.log(`🔥 Active templates: ${activeTemplatesCount}`);
        console.log(`📄 Total templates in DB: ${totalTemplatesInDB}`);
        
        res.status(200).json({
            success: true,
            data: dashboardStats
        });
        
    } catch (error) {
        console.error('❌ Error fetching dashboard statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics',
            error: error.message
        });
    }
};