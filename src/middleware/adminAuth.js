const jwt = require('jsonwebtoken');
const User = require('../models/User');

const isAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //  user
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    //  role
    if (user.role === "admin" || user.role === "superadmin") {
      req.user = user;
      req.user._id = "68b9a8cb149749fdd44bf1a0" // test;

      // console.log("admin storeid", user.storeId );
      req.storeId = "68b9a8cb149749fdd44bf1a2" // test
      
      // if (user?.storeId ) {
      //   req.storeId = user.storeId; 
      // }

      return next();
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin rights required.",
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      error: error.message,
    });
  }
};

const isSuperAdmin = async (req, res, next) => {
  try {
   const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (user.role === 'superadmin') {
      req.user = user;
      next();
    } else {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Super admin rights required.' 
      });
    }
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

module.exports = { isAdmin, isSuperAdmin };