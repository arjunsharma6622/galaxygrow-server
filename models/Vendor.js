const mongoose = require("mongoose");

const VendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    image: {
      type: String,
    },
    businesses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
      },
    ],
    otp: {
      value: {
        type: String,
      },
      expires: {
        type: Date,
      },
      createdAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Vendor", VendorSchema);
