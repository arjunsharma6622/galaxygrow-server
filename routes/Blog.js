const express = require("express");
const router = express.Router();
const Blog = require("../models/Blog");
const Category = require("../models/Category");
const cloudinary = require("cloudinary").v2;
const logger = require("../utils/logger");

router.get("/", async (req, res) => {
  try {
    const blog = await Blog.find({});
    res.send(blog).status(200);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    res.send(blog).status(200);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

//get blogs by category
router.get("/category/:categoryName", async (req, res) => {
  try {
    const formattedCategoryName = req.params.categoryName
      .split("-")
      .join(" ")
      .toLowerCase();
    const category = await Category.findOne({
      name: new RegExp(`^${formattedCategoryName}$`, "i"),
    });
    const blog = await Blog.find({ category: category._id });
    res.send(blog).status(200);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

router.get("/category/:categoryName/:id", async (req, res) => {
  try {
    const formattedCategoryName = req.params.categoryName
      .split("-")
      .join(" ")
      .toLowerCase();
    const category = await Category.findOne({
      name: new RegExp(`^${formattedCategoryName}$`, "i"),
    });
    if (!category) {
      return res.status(404).send("Category not found");
    }
    const blog = await Blog.findOne({
      category: category._id,
      _id: req.params.id,
    });
    res.send(blog).status(200);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

//create a blog
router.post("/create", async (req, res) => {
  try {
    const newBlog = new Blog(req.body);
    await newBlog.save();
    res.status(201).send(newBlog);
  } catch (error) {
    logger.error(error);
    res.status(400).send(error);
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body; // Assuming the updates are sent in the request body
    // Use the findByIdAndUpdate method to update the business record
    const updatedBlog = await Blog.findByIdAndUpdate(id, updates, {
      new: true,
    });

    // Check if the business record with the given id exists
    if (!updatedBlog) {
      return res.status(404).send("Blog not found");
    }

    res.status(200).send({
      success: true,
      message: "Blog updated successfully",
      data: updatedBlog,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // Use the findByIdAndDelete method to delete the business record
    const deletedBlog = await Blog.findByIdAndDelete(id);

    const extractPublicIdFromUrl = (url) => {
      // Regular expression to match everything before the last slash and dot
      const regex = /\/([^/.]+)(?:\.[^/]+)?$/;
      const match = url.match(regex);

      // Check if a match is found
      if (match && match[1]) {
        // Extracted part before the last slash and dot is in match[1]
        return match[1];
      } else {
        // Return null if no match is found
        return null;
      }
    };

    cloudinary.uploader
      .destroy(`aresuno/blogs/${extractPublicIdFromUrl(deletedBlog.image)}`)
      .then((result) => console.log(result))
      .catch((error) => console.log(error));

    // Check if the business record with the given id exists
    if (!deletedBlog) {
      return res.status(404).send("Blog not found");
    }

    res.status(200).send({ message: "Blog deleted successfully", deletedBlog });
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

module.exports = router;
