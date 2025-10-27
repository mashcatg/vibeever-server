const mongoose = require("mongoose");

const WithdrawalSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true
  },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ["pending", "approved", "rejected"], 
    default: "pending" 
  },
}, { timestamps: true });

module.exports = mongoose.model("Withdrawal", WithdrawalSchema);
