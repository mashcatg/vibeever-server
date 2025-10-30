const jwt = require('jsonwebtoken');
const User = require('../models/User');

const isAdmin = async (req, res, next) => {
  try {

    // console.log(req.headers);
    // Get token from header
    const token = req.headers.authorization
    // console.log(token ,"token");

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    } 
     console.log(user?.role);
    // Check if user is admin or superadmin
    if (user.role === 'admin' || user.role === 'superadmin') {
      req.user = user;
      next();
    } else {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin rights required.' 
      });
    }
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
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