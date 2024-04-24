const express = require("express");
const router = express.Router();
const Business = require("../models/Business");
const { verification, validateRole } = require("../middlewares/authorization");
const Category = require("../models/Category");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const User = require("../models/User");
const City = require("../models/City");
const logger = require("../utils/logger");

router.post(
  "/register",
  verification,
  validateRole(["admin", "vendor"]),
  async (req, res) => {
    try {
      const newBusiness = new Business(req.body);
      const categoryID = req.body.category;
      await newBusiness.save();

      // updating categories with the newly registered businesses
      const category = await Category.findById(categoryID);
      category.businesses.push(newBusiness._id);

      await category.save();
      // updating vendor with the newly registered businesses
      const vendorId = newBusiness.vendorId;
      await User.updateOne(
        { _id: vendorId },
        { $push: { businesses: newBusiness._id } },
      );

      res.status(201).send(newBusiness);
    } catch (error) {
      logger.error(error.message);
      res.status(400).send(error.message);
    }
  },
);

router.get("/getNearbyBusinesses", async (req, res) => {
  try {
    let lat; // Access lat using req.query.lat
    let long; // Access long using req.query.long
    const categoryName = req.query.categoryName; // Access categoryId using req.query.categoryId
    const categoryId = await Category.findOne({
      name: new RegExp(categoryName, "i"),
    }).select("_id");

    if (req.query.city) {
      const city = await City.findOne({
        name: new RegExp(req.query.city, "i"),
      });
      if (!city) {
        return res.status(404).send({ message: "City not found." });
      }
      lat = city.coordinates[1];
      long = city.coordinates[0];
    } else if (req.query.lat && req.query.long) {
      lat = req.query.lat;
      long = req.query.long;
    }

    // Ensure that lat and long are provided in the query parameters
    if (!lat || !long) {
      return res
        .status(400)
        .send({ message: "Latitude and longitude are required." });
    }

    let aggregationPipeline = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(long), parseFloat(lat)],
          },
          distanceField: "distance", // Adds a field 'distance' to each document representing the distance
          maxDistance: 100000, // 100 kilometers; adjust as per your requirement
          spherical: true, // Indicates the use of spherical geometry (for Earth-like sphere)
        },
      },
    ];

    // If categoryId is provided, add a $match stage to filter businesses by subCategory
    if (categoryId) {
      aggregationPipeline.push({
        $match: {
          category: new mongoose.Types.ObjectId(categoryId),
        },
      });
    }

    const businesses = await Business.aggregate(aggregationPipeline);
    res.status(200).send({ businesses, coordinates: [long, lat] }); // Sending a 200 OK response
  } catch (error) {
    logger.error("Error fetching nearby businesses:", error);
    res.status(500).send({ message: "Internal Server Error" }); // Sending a 500 Internal Server Error response
  }
});

router.get("/getAllBusinessesCount", async (req, res) => {
  try {
    const businessesCount = await Business.countDocuments({});
    res.send({ businessesCount }).status(200);
  } catch (error) {
    logger.error("Error fetching nearby businesses:", error);
    res.status(500).send(error);
  }
});

// READ ALL
router.get("/", async (req, res) => {
  try {
    const businesses = await Business.find({}).populate("category");
    res.send(businesses);
  } catch (error) {
    logger.error("Error fetching nearby businesses:", error);
    res.status(500).send(error);
  }
});

// READ ONE
router.get("/:id", async (req, res) => {
  try {
    const business = await Business.findById(req.params.id)
      .populate("posts")
      .populate("ratings")
      .populate({ path: "category", select: "name" });
    if (!business) {
      return res.status(404).send("Business not found");
    }
    res.send(business);
  } catch (error) {
    logger.error("Error fetching nearby businesses:", error);
    res.status(500).send(error);
  }
});

router.get("/getBusinessByName/:businessName", async (req, res) => {
  try {
    const formattedBusinessName = req.params.businessName.replace(/-/g, " ");
    const business = await Business.findOne({
      name: { $regex: new RegExp(`^${formattedBusinessName}$`, "i") },
    })
      .populate("posts")
      .populate("ratings")
      .populate({ path: "category", select: "name" });

    if (!business) {
      return res.status(404).send("Business not found");
    }

    res.send(business);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

router.put(
  "/:id",
  verification,
  validateRole(["admin", "vendor"]),
  async (req, res) => {
    try {
      const id = req.params.id;
      const updates = req.body; // Assuming the updates are sent in the request body

      // Use the findByIdAndUpdate method to update the business record
      const updatedBusiness = await Business.findByIdAndUpdate(id, updates, {
        new: true,
      });

      // Check if the business record with the given id exists
      if (!updatedBusiness) {
        return res.status(404).send("Business not found");
      }

      res.status(200).send("Business updated successfully");
    } catch (error) {
      logger.error(error);
      res.status(500).send("Internal Server Error");
    }
  },
);

router.patch("/:id/rating", verification, async (req, res, next) => {
  const { rating, review } = req.body;
  const ratingReview = {
    user: { name: req.user.name },
    rating,
    review,
  };

  try {
    const business = await Business.findById(req.params.id);
    if (!business) {
      return res.status(404).send();
    }
    business.ratingsReviews.push(ratingReview);
    await business.save();
    res.send(business);
  } catch (error) {
    logger.error(error);
    res.status(400).json({ message: "error in rating and review", error });
  }
});

// DELETE
router.delete(
  "/:id",
  verification,
  validateRole(["admin", "vendor"]),
  async (req, res, next) => {
    try {
      const business = await Business.findByIdAndDelete(req.params.id);

      await User.findOneAndUpdate(
        { _id: req.user._id },
        { $pull: { businesses: new ObjectId(req.params.id) } },
      );
      const categoryId = business.category;
      const category = await Category.findById(categoryId);
      category.businesses.pull(req.params.id);
      await category.save();

      if (!business) {
        return res.status(404).send("Business not found");
      }
      res.send("Business deleted");
    } catch (error) {
      logger.error(error);
      res.status(500).send(error);
    }
  },
);

router.get("/getbusinessesbycategory/:categoryId", async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const businesses = await Business.find({ category: categoryId }).populate(
      "ratings",
    );
    res.status(202).send(businesses);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

//update business modeofpayment icon url
router.patch("/update-modeofpayment-icon/:id", async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    const paymentModes = [
      {
        name: "Cash",
        icon: "https://res.cloudinary.com/dexnb3wkw/image/upload/v1705817172/aresuno/paymentModes/pwgkaicbn4oiqlmbdu4y.png",
      },
      {
        name: "Card",
        icon: "https://res.cloudinary.com/dexnb3wkw/image/upload/v1705817173/aresuno/paymentModes/dy4nsy9gl6m6bnb2nfmd.png",
      },
      {
        name: "Visa",
        icon: "https://res.cloudinary.com/dexnb3wkw/image/upload/v1705817170/aresuno/paymentModes/xoinunrckkg3rww8k77b.png",
      },
      {
        name: "Rupay",
        icon: "https://res.cloudinary.com/dexnb3wkw/image/upload/v1705817172/aresuno/paymentModes/obi22zyxsbq5xlzlp0ws.png",
      },
      {
        name: "Mastercard",
        icon: "https://res.cloudinary.com/dexnb3wkw/image/upload/v1705817172/aresuno/paymentModes/hhqomnbw4qrwdwhob5mp.png",
      },
      {
        name: "UPI",
        icon: "https://res.cloudinary.com/dexnb3wkw/image/upload/v1705817171/aresuno/paymentModes/xkiu9aow2dqy0rr7dtrn.png",
      },
      {
        name: "Google Pay",
        icon: "https://res.cloudinary.com/dexnb3wkw/image/upload/v1705817170/aresuno/paymentModes/fvpdyuhabbvdkqdyu0ob.png",
      },
      {
        name: "PhonePe",
        icon: "https://res.cloudinary.com/dexnb3wkw/image/upload/v1705817170/aresuno/paymentModes/cbazb5dpnijmc488pvbx.png",
      },
      {
        name: "Patym",
        icon: "https://res.cloudinary.com/dexnb3wkw/image/upload/v1705817171/aresuno/paymentModes/rs14sxkqwwnbxshhrbbw.png",
      },
      {
        name: "Apple Pay",
        icon: "https://res.cloudinary.com/dexnb3wkw/image/upload/v1705817171/aresuno/paymentModes/xkiu9aow2dqy0rr7dtrn.png",
      },
      {
        name: "Razorpay",
        icon: "https://res.cloudinary.com/dexnb3wkw/image/upload/v1705817172/aresuno/paymentModes/vlkap6xgiua5svwbjkpm.png",
      },
      {
        name: "American Express",
        icon: "https://res.cloudinary.com/dexnb3wkw/image/upload/v1705817171/aresuno/paymentModes/xr6kdw1itposojv1bsw0.png",
      },
    ];

    business.modeOfPayment.forEach((mode) => {
      paymentModes.forEach((paymentModes) => {
        if (mode.name === paymentModes.name) {
          mode.icon = paymentModes.icon;
        }
      });
    });

    await business.save();
    res.status(200).send(business);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

module.exports = router;
