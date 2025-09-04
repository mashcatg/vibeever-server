const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: 'Not authorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-passwordHash -salt');
    if (!user) return res.status(404).json({ message: 'User not found' });

    req.user = user;
    req.role = user.role;
    req.storeId = user.role === 'admin' ? user.storeId : null;
    req.isSuperAdmin = user.role === 'superadmin';

    console.log('role:', req.role, 'storeId:', req.storeId);

    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Unauthorized' });
  }
};
