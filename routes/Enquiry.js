const express = require("express");
const Enquiry = require("../models/Enquiry");
const Business = require("../models/Business");
const router = express.Router();
const logger = require("../utils/logger");

router.post("/create", async (req, res) => {
  try {
    const newEnquiry = new Enquiry(req.body);
    if (req.body.business) {
      const business = await Business.findById(req.body.business);
      business.enquiries.push(newEnquiry._id);
      await business.save();
    }
    await newEnquiry.save();
    res.status(200).send(newEnquiry);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err);
  }
});

router.get("/", async (req, res) => {
  try {
    const enquiries = await Enquiry.find()
      .populate("category")
      .populate("business");
    res.status(200).send(enquiries);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const enquiries = await Enquiry.findById(req.params.id);
    res.status(200).send(enquiries);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err);
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const updatedEnquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );
    res.status(200).send(updatedEnquiry);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deletedEnquiry = await Enquiry.findByIdAndDelete(req.params.id);
    res.status(200).send(deletedEnquiry);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err);
  }
});

module.exports = router;
