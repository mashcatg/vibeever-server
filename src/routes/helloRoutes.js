const express = require('express');
const { createHello, getHello } = require('../controllers/helloController');
const { protect } = require('../middleware/authMiddleware');
 

const helloRoutes = express.Router();


helloRoutes.post('/', createHello);
helloRoutes.get('/', protect, getHello);

 
module.exports = helloRoutes;