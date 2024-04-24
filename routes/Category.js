const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const { verification, validateRole } = require("../middlewares/authorization");
const logger = require("../utils/logger");

router.get("/", async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).send(categories);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err);
  }
});

// get category by name
router.get("/:categoryName", async (req, res) => {
  try {
    const formattedCategoryName = req.params.categoryName;
    const category = await Category.findOne({
      name: new RegExp(`^${formattedCategoryName}$`, "i"),
    });
    if (!category) {
      return res.status(404).send("Category not found");
    }
    res.status(200).send(category);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err);
  }
});

router.put("/:id", verification, validateRole(["admin"]), async (req, res) => {
  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );
    res.status(200).send(updatedCategory);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err);
  }
});

// POST route to create one or more categories
router.post(
  "/create",
  verification,
  validateRole(["admin"]),
  async (req, res) => {
    try {
      const categoriesData = req.body; // Assuming req.body contains an array of category objects
      // Create multiple categories at once using insertMany
      const createdCategories = await Category.insertMany(categoriesData);
      res.status(201).json(createdCategories); // Return the created categories
    } catch (error) {
      logger.error(error);
      res.status(500).json({ error: "Failed to create categories" });
    }
  },
);

// delete category
router.delete(
  "/:id",
  verification,
  validateRole(["admin"]),
  async (req, res) => {
    try {
      const deletedCategory = await Category.findByIdAndDelete(req.params.id);
      res.status(200).send(deletedCategory);
    } catch (err) {
      logger.error(err);
      res.status(500).send(err);
    }
  },
);

router.get("/update-business-type", async (req, res) => {
  try {
    // Fetch all categories
    const categories = await Category.find();

    // Iterate through categories and update businessType
    for (const category of categories) {
      if (!category.businessType) {
        // If businessType doesn't exist, update it to 'service'
        await Category.findByIdAndUpdate(category._id, {
          businessType: "service",
        });
      }
    }

    res.status(200).json({ message: "BusinessType updated successfully." });
  } catch (error) {
    logger.error("Error updating businessType:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
