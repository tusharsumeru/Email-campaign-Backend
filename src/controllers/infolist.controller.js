import InfoList from '../models/info_list.model.js';

/**
 * Get all data from database with pagination and filtering
 */
export const getAllData = async (req, res) => {
  try {
    const { page = 1, limit = 10, city, list_name, search } = req.query;
    
    // Build filter object
    const filter = {};
    if (city) filter.city = { $regex: city, $options: 'i' };
    if (list_name) filter.list_name = { $regex: list_name, $options: 'i' };
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
    
    const data = await InfoList.findById(id);
    
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
    
    const data = await InfoList.find({ email_first: email.toLowerCase() });
    
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
