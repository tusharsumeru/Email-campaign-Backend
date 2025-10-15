import InfoList from '../models/info_list.model.js';

/**
 * Handle webhook data from Growme Organic
 * Only processes data if location is Dubai
 */
export const handleGrowmeWebhook = async (req, res) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`\n🔥 WEBHOOK RECEIVED 🔥`);
    console.log(`[${timestamp}] ===== GROWME WEBHOOK DEBUG =====`);
    console.log(`Request Method: ${req.method}`);
    console.log(`Request URL: ${req.url}`);
    console.log(`Request Headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`Request Body:`, JSON.stringify(req.body, null, 2));
    console.log(`Request Query:`, JSON.stringify(req.query, null, 2));
    console.log(`Request Params:`, JSON.stringify(req.params, null, 2));
    console.log(`Content-Type: ${req.get('Content-Type')}`);
    console.log(`Content-Length: ${req.get('Content-Length')}`);
    console.log(`User-Agent: ${req.get('User-Agent')}`);
    console.log(`IP Address: ${req.ip || req.connection.remoteAddress}`);
    console.log(`===== END WEBHOOK DEBUG =====\n`);
    
    const webhookData = req.body;
    
    // No validation - just process the data

    // Check if location is Dubai (case-insensitive) - using the exact field name from CSV
    const location = webhookData.city;
    console.log(`\n📍 LOCATION CHECK:`);
    console.log(`Location field value: "${location}"`);
    console.log(`Location type: ${typeof location}`);
    console.log(`Location check result: ${location && location.toLowerCase().includes('dubai')}`);
    
    if (!location || !location.toLowerCase().includes('dubai')) {
      console.log(`❌ LOCATION FILTER: "${location}" is not Dubai, skipping data entry`);
      const responseTime = Date.now() - startTime;
      console.log(`⏱️  Response time: ${responseTime}ms`);
      console.log(`===== WEBHOOK FILTERED =====\n`);
      
      return res.status(200).json({
        success: true,
        message: 'Data received but not processed - location is not Dubai',
        location: location,
        filtered: true,
        response_time_ms: responseTime
      });
    }
    
    console.log(`✅ LOCATION CHECK PASSED: "${location}" contains Dubai`);

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
    console.log(`\n💾 SAVING TO DATABASE:`);
    console.log(`Data to save:`, JSON.stringify(infoListData, null, 2));
    
    const newRecord = new InfoList(infoListData);
    const savedRecord = await newRecord.save();

    const responseTime = Date.now() - startTime;
    console.log(`✅ SUCCESSFULLY SAVED RECORD:`);
    console.log(`Record ID: ${savedRecord._id}`);
    console.log(`Email: ${savedRecord.email_first}`);
    console.log(`Full Name: ${fullName}`);
    console.log(`Location: ${savedRecord.city}`);
    console.log(`Response time: ${responseTime}ms`);
    console.log(`===== WEBHOOK SUCCESS =====\n`);

    res.status(201).json({
      success: true,
      message: 'Data successfully processed and saved',
      record_id: savedRecord._id,
      email: savedRecord.email_first,
      full_name: fullName,
      location: savedRecord.city,
      created_at: savedRecord.created_date,
      response_time_ms: responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`\n❌ WEBHOOK ERROR:`);
    console.error(`[${timestamp}] Error processing webhook data:`, error);
    console.error(`Error stack:`, error.stack);
    console.error(`Response time: ${responseTime}ms`);
    console.error(`===== WEBHOOK ERROR =====\n`);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while processing webhook data',
      error: error.message,
      response_time_ms: responseTime,
      timestamp: timestamp
    });
  }
};
