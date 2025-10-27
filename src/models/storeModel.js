const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
    },
    storeDescription: {
      type: String,
      trim: true,
    },
    storeUsername: { type: String, unique: true, required: true },

    storeLogo: {
      type: String,
      default:
        "https://img.freepik.com/free-vector/shop-logo-template_23-2147504027.jpg?w=740",
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    walletBalance: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    withdrawn: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Store", storeSchema);
