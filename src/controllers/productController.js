const Product = require("../models/Product");
const Category = require("../models/Category"); // Add this at the top
const mongoose = require("mongoose");
const generateUniqueSlug = require("../utils/slugMaker");

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
    isPublished,
    sroreId,

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
      const catDoc = await Category.findOne({
        slug: { $regex: `^${category}$`, $options: "i" },
      }).select("_id");
      if (catDoc) query.category = catDoc._id;
      else query.category = null;
    }
  }

  if (subcategory && mongoose.Types.ObjectId.isValid(subcategory)) {
    query.subcategory = new mongoose.Types.ObjectId(subcategory);
  }

  if (tags) query.tags = { $in: tags.split(",") };
  if (isPublished !== undefined) query.isPublished = isPublished === "true";

  // Admins see only their store products
if (sroreId) {
  query.storeId =new mongoose.Types.ObjectId(sroreId);
}

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } },
    ];
  }

  return query;
};

exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || "createdAt";
    const order = req.query.order || "desc";

    const query = await buildQuery(req.query);

    console.log(req?.user?.role, "req?.user?.role");


// Non-admin users can only see published products
if (!req.user || req.user.role === "user") {
  query.isPublished = true;
}

// Admins see only their own store products
if (req.user?.role === "admin") {
  query.storeId = req.storeId;
}


    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate("category", "name slug")
      .populate("user", "fullName username")
      .populate("storeId", "storeLogo storeName")

      .sort({ [sortBy]: order })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      products,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



exports.getProductfREE = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || "createdAt";
    const order = req.query.order || "desc";

    const query = await buildQuery(req.query);


    // Non-admin users can only see published products
    if (req?.user?.role === "user" || req?.user?.role === "admin" ||req?.user?.role === undefined) {
      query.isPublished = true;
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .select("-download_url")
      .populate("category", "name slug")
      .populate("user", "fullName username")
      .populate("storeId", "storeLogo storeName")

      .sort({ [sortBy]: order })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      products,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get single product
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name slug")
      .populate("user", "fullName username")
      .populate("storeId", "storeLogo storeName");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!product.isPublished && req.user.role === "user") {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const slug = await generateUniqueSlug(req.body.title);
    console.log(req.storeId, "req.storeId");

    const product = await Product.create({
      ...req.body,
      user: req.user._id,
      storeId: req.storeId,
      slug,
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.title) {
      updates.slug = await generateUniqueSlug(updates.title);
    }

  const product = await Product.findOneAndUpdate(
  { _id: req.params.id, storeId: req.storeId }, 
  updates,
  { new: true, runValidators: true }
);


    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete product (admin only)
exports.deleteProduct = async (req, res) => {
  try {
  const product = await Product.findOneAndDelete({
  _id: req.params.id,
  storeId: req.storeId,
});

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
