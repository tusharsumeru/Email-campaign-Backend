import mongoose from 'mongoose';

// Info List Schema
const infoListSchema = new mongoose.Schema({
  email_first: {
    type: String,
    trim: true,
    lowercase: true
  },
  email_second: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  company_phone: {
    type: String,
    trim: true
  },
  url: {
    type: String,
    trim: true
  },
  job_title: {
    type: String,
    trim: true
  },
  company_name: {
    type: String,
    trim: true
  },
  company_domain: {
    type: String,
    trim: true,
    lowercase: true
  },
  company_id: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  linkedin_id: {
    type: String,
    trim: true
  },
  created_date: {
    type: Date,
    default: Date.now
  },
  list_name: {
    type: String,
    trim: true
  },
  full_name: {
    type: String,
    trim: true
  }
}, {
  timestamps: true, // This adds createdAt and updatedAt fields automatically
  collection: 'info_lists' // Explicitly set collection name
});

// Indexes for better query performance
infoListSchema.index({ email_first: 1 });
infoListSchema.index({ list_name: 1 });
infoListSchema.index({ company_name: 1 });
infoListSchema.index({ created_date: -1 });
infoListSchema.index({ full_name: 1 });

// Note: full_name is now a real field, not a virtual field

// Pre-save middleware to ensure email_first is always lowercase
infoListSchema.pre('save', function(next) {
  if (this.email_first) {
    this.email_first = this.email_first.toLowerCase();
  }
  if (this.email_second) {
    this.email_second = this.email_second.toLowerCase();
  }
  next();
});

// Static method to find by email
infoListSchema.statics.findByEmail = function(email) {
  return this.findOne({ email_first: email.toLowerCase() });
};

// Static method to find by list name
infoListSchema.statics.findByListName = function(listName) {
  return this.find({ list_name: listName });
};

// Instance method to get formatted contact info
infoListSchema.methods.getContactInfo = function() {
  return {
    name: this.full_name,
    primaryEmail: this.email_first,
    secondaryEmail: this.email_second,
    phone: this.phone,
    companyPhone: this.company_phone,
    company: this.company_name,
    jobTitle: this.job_title
  };
};

export default mongoose.model('InfoList', infoListSchema);
