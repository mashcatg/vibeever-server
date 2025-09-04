const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { type } = require("os");

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, "Please provide your name"],
    trim: true,
  },
  userName: {
    type: String,
  },

  bio: {
    type: String,
  },
  image: {
    type: String,
    default:
      "https://img.freepik.com/free-vector/young-prince-vector-illustration_1308-174367.jpg?semt=ais_hybrid&w=740",
  },

  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    lowercase: true,
  },
  passwordHash: String,
  salt: String,
  phoneNumber: String,

  role: {
    type: String,
    enum: ["user", "admin", "superadmin"],
    default: "user",
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,

  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
  },

  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  googleId: String,
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    this.salt = crypto.randomBytes(16).toString("hex");
    this.passwordHash = await bcrypt.hash(this.password + this.salt, 10);
    this.password = undefined;
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("User", userSchema);
