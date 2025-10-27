const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true
  },
  totalEarned: { type: Number, default: 0 },
  availableBalance: { type: Number, default: 0 },
  withdrawnAmount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Wallet", WalletSchema);
