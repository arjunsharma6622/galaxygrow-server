const mongoose = require("mongoose");

const CallLeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    verified: {
      type: Boolean,
      required: true,
      default: false,
    },
    otp: {
      value: {
        type: String,
      },
      expires: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("CallLead", CallLeadSchema);
