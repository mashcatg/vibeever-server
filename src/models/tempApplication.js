const mongoose = require("mongoose");

const tempApplicationSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, required: true },
  password: String, // plain for now, or hash if you prefer
  userName: String,
  storeName: String,
  storeDescription: String,
attachments: [
      {
        fileName: String,
        fileUrl: String,
      },
    ],
  storeUsername: String,
  otp: Number,
  otpExpiry: Date,
});

module.exports = mongoose.model("TempApplication", tempApplicationSchema);
