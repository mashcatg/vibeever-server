const express = require('express');
const { isAdmin, isSuperAdmin } = require('../middleware/adminAuth');
const { getSingleStore, getAllStores, getSingleID } = require('../controllers/storeController'); 

const storeRoute = express.Router();

storeRoute.get("/getAll",   getAllStores);
//use it for fetch data inadmin panel
storeRoute.get("/AdminStore", isAdmin , getSingleID);


// it for store page like /yaminStore 
storeRoute.get("/:storeUsername",  getSingleStore);



// update store



module.exports = storeRoute;
