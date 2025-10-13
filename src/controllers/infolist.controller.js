import InfoList from '../models/info_list.model.js';
import EmailStatus from '../models/email_status.model.js';

/**
 * Get all data from database with pagination and filtering
 */
export const getAllData = async (req, res) => {
  try {
    const { page = 1, limit = 10, city, list_name, search, has_emails_sent, template_id } = req.query;
    
    // Build filter object
    const filter = {};
    if (city) filter.city = { $regex: city, $options: 'i' };
    if (list_name) filter.list_name = { $regex: list_name, $options: 'i' };
    
    // Filter by email status
    if (has_emails_sent !== undefined) {
      if (has_emails_sent === 'true') {
        filter.mailsent = true; // Has emails sent
      } else {
        filter.mailsent = false; // No emails sent
      }
    }
    
    // Filter by specific template
    if (template_id) {
      filter.sent_template_id = template_id;
    }
    
    if (search) {
      filter.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email_first: { $regex: search, $options: 'i' } },
        { company_name: { $regex: search, $options: 'i' } },
        { job_title: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const data = await InfoList.find(filter)
      .populate('sent_template_id', 'name slug category')
      .populate('email_status_id')
      .sort({ created_date: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await InfoList.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: data,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_records: total,
        records_per_page: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching data from database',
      error: error.message
    });
  }
};

/**
 * Get data by ID
 */
export const getDataById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = await InfoList.findById(id)
      .populate('sent_template_id', 'name slug category')
      .populate('email_status_id');
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('Error fetching data by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching data by ID',
      error: error.message
    });
  }
};

/**
 * Get data by email
 */
export const getDataByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
    const data = await InfoList.find({ email_first: email.toLowerCase() })
      .populate('sent_template_id', 'name slug category')
      .populate('email_status_id');
    
    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No records found for this email'
      });
    }
    
    res.status(200).json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('Error fetching data by email:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching data by email',
      error: error.message
    });
  }
};

/**
 * Get statistics/summary data
 */
export const getStatistics = async (req, res) => {
  try {
    const totalRecords = await InfoList.countDocuments();
    const dubaiRecords = await InfoList.countDocuments({ city: { $regex: 'dubai', $options: 'i' } });
    
    // Count records with emails sent
    const emailsSentRecords = await InfoList.countDocuments({ mailsent: true });
    const notEmailsSentRecords = await InfoList.countDocuments({ mailsent: false });
    
    // Get email statistics by template from EmailStatus
    const emailStatsByTemplate = await EmailStatus.aggregate([
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
        $sort: { total_sends: -1 }
      }
    ]);
    
    // Get unique list names
    const listNames = await InfoList.distinct('list_name');
    
    // Get records by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyData = await InfoList.aggregate([
      {
        $match: {
          created_date: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$created_date' },
            month: { $month: '$created_date' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    res.status(200).json({
      success: true,
      statistics: {
        total_records: totalRecords,
        dubai_records: dubaiRecords,
        emails_sent_records: emailsSentRecords,
        not_emails_sent_records: notEmailsSentRecords,
        email_stats_by_template: emailStatsByTemplate,
        list_names: listNames,
        monthly_data: monthlyData
      }
    });
    
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

/**
 * Get email status for a specific user
 */
export const getEmailStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user info
    const user = await InfoList.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get email status
    const emailStatus = await EmailStatus.findByInfoListUserId(id);
    
    if (!emailStatus) {
      return res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.full_name,
          email: user.email_first,
          company: user.company_name,
          list_name: user.list_name
        },
        emailStatus: null,
        message: 'No email status found for this user'
      });
    }
    
    // Get templates with counts
    const templatesWithCounts = emailStatus.getTemplatesWithCounts();
    
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.full_name,
        email: user.email_first,
        company: user.company_name,
        list_name: user.list_name,
        mailsent: user.mailsent,
        sent_template_id: user.sent_template_id
      },
      emailStatus: {
        id: emailStatus._id,
        templates: templatesWithCounts,
        totalTemplates: templatesWithCounts.length,
        totalEmailsSent: templatesWithCounts.reduce((sum, template) => sum + template.sendCount, 0)
      }
    });
    
  } catch (error) {
    console.error('Error fetching email status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching email status',
      error: error.message
    });
  }
};

/**
 * Delete data by ID
 */
export const deleteDataById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const data = await InfoList.findByIdAndDelete(id);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Record deleted successfully',
      deleted_data: data
    });
    
  } catch (error) {
    console.error('Error deleting data:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting data',
      error: error.message
    });
  }
};
