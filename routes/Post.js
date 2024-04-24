const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const Business = require("../models/Business");
const logger = require("../utils/logger");

router.post("/create", async (req, res, next) => {
  const { businessId, image, description } = req.body;

  try {
    const post = new Post({ businessId, description, image });
    await post.save();

    const busiess = await Business.findById(businessId);
    busiess.posts.push(post._id);
    await busiess.save();

    res.status(201).send(post);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

router.get("/all-posts", async (req, res, next) => {
  try {
    const posts = await Post.find();
    res.status(200).send(posts);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

router.get("/all-posts/:id", async (req, res, next) => {
  try {
    const posts = await Post.find({ businessId: req.params.id });
    res.status(200).send(posts);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    res.status(200).send(post);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).send();
    }

    const updates = Object.keys(req.body);
    const allowedUpdates = ["description"];
    const isValidOperation = updates.every((update) =>
      allowedUpdates.includes(update),
    );

    if (!isValidOperation) {
      return res.status(400).send({ error: "Invalid updates!" });
    }

    updates.forEach((update) => (post[update] = req.body[update]));
    await post.save();

    res.send(post);
  } catch (error) {
    logger.error(error);
    res.status(400).send(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).send("Post not found (or) Already deleted");
    }

    res.status(200).send("Post Deleted Successfully");
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

module.exports = router;
