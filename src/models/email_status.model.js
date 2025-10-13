import mongoose from 'mongoose';

// Email Status Schema
const emailStatusSchema = new mongoose.Schema({
  infolist_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InfoList',
    required: true
  },
  email_status_object: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'email_status'
});

// Indexes for better query performance
emailStatusSchema.index({ infolist_user_id: 1 });

// Static method to find by infolist user id
emailStatusSchema.statics.findByInfoListUserId = function(userId) {
  return this.findOne({ infolist_user_id: userId });
};

// Instance method to update email status for a template
emailStatusSchema.methods.updateEmailStatus = function(templateId, templateName, templateSlug, emailType = 'bulk', messageId = null) {
  const now = new Date();
  const templateKey = templateId.toString();
  
  if (!this.email_status_object[templateKey]) {
    // First time sending this template
    this.email_status_object[templateKey] = {
      template_id: templateId,
      template_name: templateName,
      template_slug: templateSlug,
      send_count: 1,
      first_sent_date: now,
      last_sent_date: now,
      email_type: emailType,
      last_message_id: messageId,
      emails: [{
        sent_at: now,
        message_id: messageId,
        status: 'sent',
        email_type: emailType,
        _id: new mongoose.Types.ObjectId()
      }]
    };
  } else {
    // Update existing template status
    this.email_status_object[templateKey].send_count += 1;
    this.email_status_object[templateKey].last_sent_date = now;
    this.email_status_object[templateKey].last_message_id = messageId;
    
    // Add new email record
    if (!this.email_status_object[templateKey].emails) {
      this.email_status_object[templateKey].emails = [];
    }
    
    this.email_status_object[templateKey].emails.push({
      sent_at: now,
      message_id: messageId,
      status: 'sent',
      email_type: emailType,
      _id: new mongoose.Types.ObjectId()
    });
  }
  
  return this.save();
};

// Instance method to get email status for a specific template
emailStatusSchema.methods.getTemplateStatus = function(templateId) {
  const templateKey = templateId.toString();
  return this.email_status_object[templateKey] || null;
};

// Instance method to get all email statuses
emailStatusSchema.methods.getAllStatuses = function() {
  return this.email_status_object;
};

// Instance method to get template count for a specific template
emailStatusSchema.methods.getTemplateCount = function(templateId) {
  const templateKey = templateId.toString();
  const templateStatus = this.email_status_object[templateKey];
  return templateStatus ? templateStatus.send_count : 0;
};

// Instance method to get all templates with their counts
emailStatusSchema.methods.getTemplatesWithCounts = function() {
  const templates = [];
  Object.keys(this.email_status_object).forEach(templateKey => {
    const template = this.email_status_object[templateKey];
    templates.push({
      templateId: template.template_id,
      templateName: template.template_name,
      templateSlug: template.template_slug,
      sendCount: template.send_count,
      firstSentDate: template.first_sent_date,
      lastSentDate: template.last_sent_date,
      emailType: template.email_type,
      lastMessageId: template.last_message_id,
      emails: template.emails || []
    });
  });
  return templates;
};

// Instance method to get email history for a specific template
emailStatusSchema.methods.getTemplateEmailHistory = function(templateId) {
  const templateKey = templateId.toString();
  const templateStatus = this.email_status_object[templateKey];
  return templateStatus ? (templateStatus.emails || []) : [];
};

export default mongoose.model('EmailStatus', emailStatusSchema);
