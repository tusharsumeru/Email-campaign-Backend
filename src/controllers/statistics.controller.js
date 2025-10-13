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

        // Get template usage statistics from EmailStatus
        const templateUsageStats = await EmailStatus.aggregate([
            {
                $project: {
                    email_status_object: 1
                }
            },
            {
                $unwind: {
                    path: '$email_status_object',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: '$email_status_object.template_id',
                    template_name: { $first: '$email_status_object.template_name' },
                    template_slug: { $first: '$email_status_object.template_slug' },
                    total_sends: { $sum: '$email_status_object.send_count' },
                    unique_recipients: { $sum: 1 },
                    first_sent: { $min: '$email_status_object.first_sent_date' },
                    last_sent: { $max: '$email_status_object.last_sent_date' }
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
                    email_status_object: 1
                }
            },
            {
                $unwind: {
                    path: '$email_status_object',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: '$email_status_object.template_id',
                    template_name: { $first: '$email_status_object.template_name' },
                    template_slug: { $first: '$email_status_object.template_slug' },
                    total_sends: { $sum: '$email_status_object.send_count' },
                    unique_recipients: { $sum: 1 },
                    first_sent: { $min: '$email_status_object.first_sent_date' },
                    last_sent: { $max: '$email_status_object.last_sent_date' }
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
        const templatesStats = await EmailTemplate.aggregate([
            {
                $lookup: {
                    from: 'email_status',
                    let: { templateId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $gt: [
                                        { $size: { $objectToArray: '$email_status_object' } },
                                        0
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                email_status_object: 1
                            }
                        },
                        {
                            $unwind: {
                                path: '$email_status_object',
                                preserveNullAndEmptyArrays: true
                            }
                        },
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$email_status_object.template_id', '$$templateId']
                                }
                            }
                        }
                    ],
                    as: 'usage'
                }
            },
            {
                $project: {
                    name: 1,
                    slug: 1,
                    category: 1,
                    isActive: 1,
                    totalSent: { $sum: '$usage.email_status_object.send_count' },
                    uniqueRecipients: { $size: '$usage' },
                    firstSent: { $min: '$usage.email_status_object.first_sent_date' },
                    lastSent: { $max: '$usage.email_status_object.last_sent_date' },
                    createdAt: 1,
                    updatedAt: 1
                }
            },
            {
                $sort: { totalSent: -1 }
            }
        ]);

        return res.status(200).json({
            message: 'All templates statistics retrieved successfully',
            templates: templatesStats
        });

    } catch (error) {
        console.error('Error fetching all templates statistics:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
