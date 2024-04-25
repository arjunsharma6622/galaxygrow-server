const express = require("express");
const router = express.Router();
const { verification, validateRole } = require("../middlewares/authorization");
const logger = require("../utils/logger");
const Package = require("../models/Package");

// retrieve all price
router.get("/getpackages", async (req, res) => {
  try {
    const packages = await Package.find();
    res.send(packages).status(200);
  } catch (error) {
    res.status(500).send(error);
  }
});

// update package and its properties
router.post(
  "/update",
  verification,
  validateRole(["admin"]),
  async (req, res) => {
    try {
      const updatePackage = await Package.findOneAndUpdate(
        {
          _id: req.body._id,
        },
        req.body,
      );
      res.status(200).send(updatePackage);
    } catch (error) {
      logger.error(error);
      res.status(400).send(error);
    }
  },
);

// post router to create new packages
router.post(
  "/create",
  verification,
  validateRole(["admin"]),
  async (req, res) => {
    try {
      const createdPackages = await Package.insertMany(req.body);
      res.status(201).json(createdPackages);
    } catch (error) {
      logger.error(error);
      res.status(500).json({ error: "Failed to create categories" });
    }
  },
);



module.exports = router;