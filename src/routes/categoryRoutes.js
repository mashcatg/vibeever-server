const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminAuth');
const { 
  createCategory,
  getCategories,
  getCategory,
  addSubcategory,
  updateCategory,
  deleteCategory,
  updateSubcategory,
  deleteSubcategory
} = require('../controllers/categoryController');

const router = express.Router();

// All routes require admin access
router.use(isAdmin);

router.route('/')
  .post(createCategory)
  .get(getCategories);

router.route('/:id')
  .get(getCategory)
  .put(updateCategory)
  .delete(deleteCategory);

router.route('/:categoryId/subcategories')
  .post(addSubcategory);

router.route('/:categoryId/subcategories/:subcategoryId')
  .put(updateSubcategory)
  .delete(deleteSubcategory);

module.exports = router;