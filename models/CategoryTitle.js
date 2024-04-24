const mongoose = require("mongoose");

const CategoryTitleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    showOnHome: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("CategoryTitle", CategoryTitleSchema);
