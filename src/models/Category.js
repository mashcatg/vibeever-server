const mongoose = require('mongoose');

const SubCategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  slug: { 
    type: String, 
    required: true
  }
});

const CategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  slug: { 
    type: String, 
    required: true
  },
  subcategories: [SubCategorySchema]
}, { 
  timestamps: true 
});

// Remove any existing compound indexes
CategorySchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model('Category', CategorySchema);