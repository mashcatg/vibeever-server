const mongoose = require('mongoose');

const TempUserSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, required: true, unique: true },
  userName: String,
  passwordHash: String,
  salt: String,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  createdAt: { type: Date, default: Date.now, expires: 10 }
});

module.exports = mongoose.model('TempUser', TempUserSchema);