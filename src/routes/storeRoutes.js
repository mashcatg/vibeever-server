const express = require('express');
const { isAdmin, isSuperAdmin } = require('../middleware/adminAuth');
const { getSingleStore, getAllStores } = require('../controllers/storeController'); 

const storeRoute = express.Router();

storeRoute.get("/getAll", isSuperAdmin , getAllStores);

storeRoute.get("/:storeUsername",  getSingleStore);



module.exports = storeRoute;
