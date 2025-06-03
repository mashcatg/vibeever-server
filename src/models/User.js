// const mongoose = require('mongoose');
// const crypto = require('crypto');

// const UserSchema = new mongoose.Schema({
//   fullName:           { type: String, required: true },
//   username:           { type: String, required: true },
//   email:          { type: String, required: true, unique: true, lowercase: true },
//   passwordHash:   { type: String },
//   salt:           { type: String },

//   // Email verification
//   isEmailVerified:        { type: Boolean, default: false },
//   emailVerificationToken: { type: String },
//   emailVerificationExpires: { type: Date },

//   // Password reset
//   resetPasswordToken:     { type: String },
//   resetPasswordExpires:   { type: Date },

//   // Google OAuth
//   googleId:       { type: String },

//   role:           { type: String, enum: ['user','superadmin','admin'], default: 'user' },
//   profileImageUrl:{ type: String },

//   createdAt:      { type: Date, default: Date.now }
// });

// // Generate email verification token
// UserSchema.methods.generateEmailVerification = function() {
//   const token = crypto.randomBytes(32).toString('hex');
//   this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
//   this.emailVerificationExpires = Date.now() + 24*60*60*1000; // 24h
//   return token;
// };

// // Generate reset token
// UserSchema.methods.generatePasswordReset = function() {
//   const token = crypto.randomBytes(32).toString('hex');
//   this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
//   this.resetPasswordExpires = Date.now() + 60*60*1000; // 1h
//   return token;
// };

// module.exports = mongoose.model('User', UserSchema);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true
  },
  userName: {
    type: String,
  },
  
  bio:{
    type:String 
  } ,
  image: {
    type: String,
    default: 'https://img.freepik.com/free-vector/young-prince-vector-illustration_1308-174367.jpg?semt=ais_hybrid&w=740' 
  },
 
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true
  },
  passwordHash: String,
  salt: String,
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  emailVerificationToken: String ,
  emailVerificationExpires: Date,
  resetPasswordToken: String ,
  resetPasswordExpires: Date,
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  googleId: String,
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    this.salt = crypto.randomBytes(16).toString('hex');
    this.passwordHash = await bcrypt.hash(this.password + this.salt, 10);
    this.password = undefined;
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema);