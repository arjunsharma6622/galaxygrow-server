const express = require("express");
const router = express.Router();
const Rating = require("../models/Rating");
const Business = require("../models/Business");
const User = require("../models/User");
const Vendor = require("../models/Vendor");
const { verification } = require("../middlewares/authorization");
const logger = require("../utils/logger");

router.get("/:businessId", async (req, res, next) => {
  const businessId = req.params.businessId;

  try {
    const ratings = await Rating.find({ businessId: businessId });

    const updatedRatings = await Promise.all(
      ratings.map(async (rating) => {
        let user;

        try {
          user = await User.findById(rating.userId);

          if (!user) {
            user = await Vendor.findById(rating.userId);
          }

          return {
            ...rating._doc,
            user: {
              name: user.name,
              image: user.image,
            },
          };
        } catch (userError) {
          logger.error("Error fetching user:", userError);
          return null;
        }
      }),
    );

    const filteredRatings = updatedRatings.filter((rating) => rating !== null);

    const avgRating =
      filteredRatings.reduce((acc, item) => acc + (item.rating || 0), 0) /
      filteredRatings.length;
    const totalRatings = filteredRatings.length;

    res
      .status(200)
      .send({ filteredRatings, avgRating: avgRating.toFixed(1), totalRatings });
  } catch (err) {
    logger.error("Error fetching ratings:", err);
    res.status(500).send(err);
  }
});

router.post("/create/:businessId", verification, async (req, res, next) => {
  try {
    const businessId = req.params.businessId;
    const userId = req.user._id;
    const rating = new Rating({
      userId: userId,
      businessId: businessId,
      rating: req.body.rating,
      review: req.body.review,
    });
    await rating.save();

    const business = await Business.findById(businessId);
    business.ratings.push(rating._id);
    await business.save();
    res.status(200).send(rating);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err);
  }
});

module.exports = router;
