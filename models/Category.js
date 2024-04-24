const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    categoryTitle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategoryTitle",
    },
    name: {
      type: String,
      required: true,
    },
    showOnHome: {
      type: Boolean,
      default: false,
    },
    image: {
      url: {
        type: String,
        required: true,
      },
      altTag: {
        type: String,
        required: true,
      },
    },
    icon: {
      type: String,
      // required: true,
    },
    businesses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
      },
    ],
    businessType: {
      type: String,
      enum: ["service", "doctor", "manufacturing"],
      required: true,
    },
    keywords: {
      type: String,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Category", CategorySchema);
