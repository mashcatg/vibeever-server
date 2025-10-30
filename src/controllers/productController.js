const Product = require('../models/Product');
const Category = require('../models/Category'); // Add this at the top
const mongoose = require('mongoose');
const Dodoclient = require('../config/dodoClient');

// Helper function for filtering
const buildQuery = async (queryParams) => {
  const query = {};
  const { 
    minPrice, 
    maxPrice, 
    category, 
    subcategory, 
    tags, 
    search, 
    isPublished 
  } = queryParams;

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (category) {
    if (mongoose.Types.ObjectId.isValid(category)) {
      query.category = new mongoose.Types.ObjectId(category);
    } else {
      const catDoc = await Category.findOne({ slug: { $regex: `^${category}$`, $options: 'i' } }).select('_id');
      if (catDoc) query.category = catDoc._id;
      else query.category = null; 
    }
  }

  if (subcategory && mongoose.Types.ObjectId.isValid(subcategory)) {
    query.subcategory = new mongoose.Types.ObjectId(subcategory);
  }

  if (tags) query.tags = { $in: tags.split(',') };
  if (isPublished !== undefined) query.isPublished = isPublished === 'true';
  
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } }
    ];
  }

  return query;
};

// Get products with filtering, pagination and search
exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order || 'desc';

    const query = await buildQuery(req.query);

    console.log(req?.user?.role , "req?.user?.role");
    
    // Non-admin users can only see published products
    if (req?.user?.role === 'user' || req?.user?.role === undefined) {
      query.isPublished = true;
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('user', 'fullName username')
      .sort({ [sortBy]: order })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      products,
      page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
exports.getProductfREE = async (req, res) => {
  try {
       const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order || 'desc';

    const query = await buildQuery(req.query);

    console.log(req?.user?.role , "req?.user?.role");
    
    // Non-admin users can only see published products
    if (req?.user?.role === 'user' || req?.user?.role === undefined) {
      query.isPublished = true;
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query).select('-download_url')
      .populate('category', 'name slug')
      .populate('user', 'fullName username')
      .sort({ [sortBy]: order })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      products,
      page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get single product
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('user', 'fullName username');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!product.isPublished && req.user.role === 'user') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Create Product Controller (admin only)
exports.createProduct = async (req, res) => {
  try {
    const { price, title, discount, description } = req.body;

    let validDiscount = { type: null, value: 0 };
    if (discount && typeof discount === "object") {
      if (["percentage", "fixed"].includes(discount.type)) {
        validDiscount.type = discount.type;
        validDiscount.value = Number(discount.value) || 0;
      }
    }

    const priceCents = Math.round(Number(price) * 100);  

    //  discount  
    let dodoDiscount = 0;
    if (validDiscount.type === "percentage") {
      dodoDiscount = validDiscount.value;  
    } else if (validDiscount.type === "fixed" && priceCents) {
      dodoDiscount = Math.round((validDiscount.value / (priceCents / 100)) * 100);
    }

    const Dodoproduct = await Dodoclient.products.create({
      price: {
        currency: "USD",
        discount: dodoDiscount,           
        price: priceCents,                 
        purchasing_power_parity: false,
        type: "one_time_price",
        tax_inclusive: false,
      },
      name: title,
      description: description,
      tax_category: "digital_products",
    });

    console.log("Dodo Product Created:", Dodoproduct);

    const productData = {
      ...req.body,
      price: priceCents, 
      user: req.user._id,
      dodoProductId: Dodoproduct.product_id || Dodoproduct.id, 
    };

    if (validDiscount.type) {
      productData.discount = validDiscount;
    } else {
      delete productData.discount;
    }

    const product = await Product.create(productData);
    console.log("Product Created in DB:", product);

    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(400).json({ message: error.message });
  }
};



// Update product (admin only)
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete product (admin only)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};