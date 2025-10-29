const mongoose = require('mongoose');

const DownloadSchema = new mongoose.Schema({
  version: { type: String, required: true },
  fileUrl: { type: String, required: true },
  releaseNotes: String,
});

const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true 
  },
  subcategory: { 
    type: mongoose.Schema.Types.ObjectId,
    required: true 
  },
  download_url : { type: String, required: true },
  version: { type: String },
  benefits: [{type: String, trim: true }],
  files : [{ type: String, trim: true }],
  dodoProductId : { type: String },

  tags: [{ type: String, trim: true }],
  thumbnailUrls: [{ type: String, required: true }],
  downloads: [DownloadSchema],
  isPublished: { type: Boolean, default: false },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  discount: {
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
    },
    value: {
      type: Number,
    },
    startDate: Date,
    endDate: Date
  },
  finalPrice: {
    type: Number,
    default: function() {
      if (!this.discount || !this.discount.value) return this.price;
      
      if (this.discount.type === 'percentage') {
        return this.price * (1 - this.discount.value / 100);
      } else {
        return Math.max(0, this.price - this.discount.value);
      }
    }
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Product', ProductSchema);