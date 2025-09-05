const express = require('express');
const {  isSuperAdmin } = require('../middleware/adminAuth');
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

// public 
router.get('/' , getCategories)
router.route('/:id').get(getCategory)

// All routes require admin access
router.use(isSuperAdmin);

router.post('/' , createCategory)
//    



router.route('/:id')
  
  .put(updateCategory)
  .delete(deleteCategory);

router.route('/:categoryId/subcategories')
  .post(addSubcategory);

router.route('/:categoryId/subcategories/:subcategoryId')
  .put(updateSubcategory)
  .delete(deleteSubcategory);

module.exports = router;