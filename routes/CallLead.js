const express = require("express");
const router = express.Router();
const CallLead = require("../models/CallLead");
const Business = require("../models/Business");
const axios = require("axios");
const logger = require("../utils/logger");

router.post("/create", async (req, res) => {
  try {
    const newCallLead = new CallLead(req.body);
    await newCallLead.save();

    const business = await Business.findById(req.body.business);
    business.callLeads.push(newCallLead._id);
    await business.save();

    const phone = newCallLead.phone;

    const otp = Math.floor(1000 + Math.random() * 9000);
    await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        variables_values: `${otp}`,
        route: "otp",
        numbers: phone,
        sender_id: "FSTSMS",
        message: `Your OTP is ${otp}. Do not share this OTP with anyone - ARESUNO`,
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API,
        },
      },
    );

    const newOTPCallLead = {
      ...newCallLead._doc,
      otp: {
        value: otp,
        expires: new Date(Date.now() + 10 * 60 * 1000),
      },
    };

    await CallLead.findByIdAndUpdate(newCallLead._id, newOTPCallLead);
    res.status(200).send(newOTPCallLead);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err);
  }
});

router.post("/createLoggedInLead", async (req, res) => {
  try {
    const newCallLead = new CallLead(req.body);
    newCallLead.verified = true;
    await newCallLead.save();

    const business = await Business.findById(req.body.business);
    business.callLeads.push(newCallLead._id);
    await business.save();
    res.status(200).send(newCallLead);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err);
  }
});

//verify and update call lead
router.patch("/verify-otp", async (req, res) => {
  try {
    const callLead = await CallLead.findById(req.body._id);
    if (callLead.otp.value !== req.body.otp) {
      return res.status(400).send("Invalid OTP");
    }
    if (callLead.otp.expires < Date.now()) {
      return res.status(400).send("OTP expired");
    }

    callLead.otp.value = null;
    callLead.otp.expires = null;
    callLead.verified = true;
    await callLead.save();
    res.status(200).send(callLead);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err);
  }
});

//get all call leads
router.get("/", async (req, res) => {
  try {
    const leads = await CallLead.find().populate("business");
    res.status(200).send(leads);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err);
  }
});

//get call lead by id
router.get("/:id", async (req, res) => {
  try {
    const lead = await CallLead.findById(req.params.id);
    res.status(200).send(lead);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err);
  }
});

//delete call lead
router.delete("/:id", async (req, res) => {
  try {
    const lead = await CallLead.findByIdAndDelete(req.params.id);
    res.status(200).send(lead);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err);
  }
});

module.exports = router;
