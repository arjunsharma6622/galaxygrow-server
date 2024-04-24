const mongoose = require("mongoose");

const BusinessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["service", "doctor", "manufacturing"],
      required: true,
    },
    profileImg: {
      type: String,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    foundedIn: {
      type: Date,
      required: true,
    },
    vendorName: {
      type: String,
    },
    description: {
      type: String,
    },
    email: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    services: [],
    address: {
      street: {
        type: String,
      },
      landmark: {
        type: String,
      },
      pincode: {
        type: Number,
      },
      city: {
        type: String,
      },
      district: {
        type: String,
      },
      state: {
        type: String,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: "2dsphere",
      },
    },
    iframe: {
      embedLink: String,
      extractedLink: String,
    },
    phone: {
      type: String,
      required: true,
    },
    timing: [
      {
        day: {
          type: String,
          enum: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
        },
        from: {
          type: String,
        },
        to: {
          type: String,
        },
        isOpen: {
          type: Boolean,
          default: false,
        },
      },
    ],
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    images: {
      logo: {
        type: String,
      },
      cover: {
        type: String,
      },
      gallery: [String],
    },
    modeOfPayment: [{ name: String, icon: String }],
    ratings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Rating",
      },
    ],
    socialLinks: {
      website: String,
      instagram: String,
      whatsapp: String,
      twitter: String,
      facebook: String,
      youtube: String,
    },
    faqs: [
      {
        question: {
          type: String,
        },
        answer: {
          type: String,
        },
      },
    ],
    callLeads: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CallLead",
      },
    ],
    enquiries: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Enquiry",
      },
    ],
  },
  {
    timestamps: true,
  },
);

BusinessSchema.pre("save", async function (next) {
  try {
    const business = this;
    if (business.isModified("name")) {
      const existingBusiness = await mongoose
        .model("Business")
        .findOne({ name: business.name });

      if (existingBusiness) {
        const err = new Error("Business with this name already exists");
        err.status = 409; // conflict status code
        return next(err);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Business", BusinessSchema);
