const express = require("express");
const router = express.Router();
const Banner = require("../models/Banner");
const { verification, validateRole } = require("../middlewares/authorization");
const logger = require("../utils/logger");

router.get("/", async (req, res) => {
  try {
    const banner = await Banner.find({});
    res.send(banner).status(200);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.post("/add", verification, validateRole(["admin"]), async (req, res) => {
  try {
    const newBanner = new Banner(req.body);
    await newBanner.save();
    res.status(201).send(newBanner);
  } catch (error) {
    logger.error(error);
    res.status(400).send(error);
  }
});

router.put("/:id", verification, validateRole(["admin"]), async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body);
    res.status(200).send(banner);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

router.delete(
  "/:id",
  verification,
  validateRole(["admin"]),
  async (req, res) => {
    try {
      const banner = await Banner.findByIdAndDelete(req.params.id);
      res.status(200).send(banner);
    } catch (error) {
      logger.error(error);
      res.status(500).send(error);
    }
  },
);

module.exports = router;
