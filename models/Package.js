const mongoose = require("mongoose");

const PackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: "Basic plan",
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    prevPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    desc: {
      type: String,
      required: true,
      default: "Our basic plan",
    },
    category: {
      type: String,
      required: true,
      enum: ["service", "doctor", "manufacturer"],
      default: "service",
    },
    features: {
      type: Array,
      required: true,
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Package", PackageSchema);