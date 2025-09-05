const Category = require('../models/Category');

 

const generateUniqueSubcategorySlug = async (categoryId, baseSlug) => {
  const category = await Category.findById(categoryId);
  let slug = baseSlug;
  let counter = 0;
  
  while (category.subcategories.some(sub => sub.slug === slug)) {
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
  
  return slug;
};

// Create category
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = await Category.create({ name, slug });
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get categories with filtering and search
exports.getCategories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;

    let query = {};
    
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { 'subcategories.name': { $regex: search, $options: 'i' } }
        ]
      };
    }

    const total = await Category.countDocuments(query);
    const categories = await Category.find(query)
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      categories,
      page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get single category
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Add subcategory
exports.addSubcategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name } = req.body;
    
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const uniqueSlug = await generateUniqueSubcategorySlug(categoryId, baseSlug);

    category.subcategories.push({
      name,
      slug: uniqueSlug
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update subcategory
exports.updateSubcategory = async (req, res) => {
  try {
    const { categoryId, subcategoryId } = req.params;
    const { name } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const category = await Category.findOneAndUpdate(
      { 
        _id: categoryId,
        'subcategories._id': subcategoryId 
      },
      { 
        $set: { 
          'subcategories.$.name': name,
          'subcategories.$.slug': slug
        } 
      },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category or subcategory not found' });
    }

    res.json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete subcategory
exports.deleteSubcategory = async (req, res) => {
  try {
    const { categoryId, subcategoryId } = req.params;
    
    const category = await Category.findByIdAndUpdate(
      categoryId,
      { $pull: { subcategories: { _id: subcategoryId } } },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, slug },
      { new: true }
    );
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};