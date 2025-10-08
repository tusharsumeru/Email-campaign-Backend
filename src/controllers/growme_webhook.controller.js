import InfoList from '../models/info_list.model.js';

/**
 * Handle webhook data from Growme Organic
 * Only processes data if location is Dubai
 */
export const handleGrowmeWebhook = async (req, res) => {
  try {
    console.log('Received webhook data from Growme Organic:', JSON.stringify(req.body, null, 2));
    
    const webhookData = req.body;
    
    // No validation - just process the data

    // Check if location is Dubai (case-insensitive) - using the exact field name from CSV
    const location = webhookData.city;
    if (!location || !location.toLowerCase().includes('dubai')) {
      console.log(`Location filter: ${location} is not Dubai, skipping data entry`);
      return res.status(200).json({
        success: true,
        message: 'Data received but not processed - location is not Dubai',
        location: location,
        filtered: true
      });
    }

    // No duplicate check - just save the data

    // Create full name from first, middle, and last name
    const fullName = [webhookData.first_name, webhookData.middle_name, webhookData.last_name]
      .filter(name => name && name.trim() !== '') // Remove empty names
      .join(' ')
      .trim();

    // Prepare data for InfoList model - using exact field names from webhook
    const infoListData = {
      email_first: webhookData.email_first,
      email_second: webhookData.email_second || '',
      full_name: fullName,
      phone: webhookData.phone || '',
      company_phone: webhookData.company_phone || '',
      url: webhookData.url || '',
      job_title: webhookData.job_title || '',
      company_name: webhookData.company_name || '',
      company_domain: webhookData.company_domain || '',
      company_id: webhookData.company_id || '',
      city: webhookData.city,
      linkedin_id: webhookData.linkedin_id || '',
      list_name: webhookData.list_name || '',
      created_date: webhookData.created_timestamp ? new Date(webhookData.created_timestamp) : new Date()
    };

    // Create new record
    const newRecord = new InfoList(infoListData);
    const savedRecord = await newRecord.save();

    console.log(`Successfully saved record for ${webhookData.email_first} from Dubai`);

    res.status(201).json({
      success: true,
      message: 'Data successfully processed and saved',
      record_id: savedRecord._id,
      email: savedRecord.email_first,
      full_name: fullName,
      location: savedRecord.city,
      created_at: savedRecord.created_date
    });

  } catch (error) {
    console.error('Error processing webhook data:', error);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while processing webhook data',
      error: error.message
    });
  }
};
