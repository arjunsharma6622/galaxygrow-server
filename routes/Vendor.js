const express = require("express");
const router = express.Router();
const Vendor = require("../models/Vendor");
const bcrypt = require("bcrypt");
const { createSecretToken } = require("../utils/SecretToken");
const { verification, validateRole } = require("../middlewares/authorization");
const User = require("../models/User");
const Business = require("../models/Business");
const axios = require("axios");
const logger = require("../utils/logger");

// CREATE
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, gender, businesses, image } =
      req.body;

    // Check if the email already exists in either Vendor or User collections
    const vendorExists = await Vendor.findOne({ email: email });
    const userExists = await User.findOne({ email: email });

    if (vendorExists || userExists) {
      return res
        .status(400)
        .send({ message: "Email already in use for registration." });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const vendor = new Vendor({
      name,
      email,
      password: hashedPassword,
      phone,
      gender,
      businesses,
      image,
    });

    await vendor.save();
    const token = createSecretToken(vendor._id);

    res.cookie("token", token, {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: "none",
      secure: true,
      withCredentials: true,
      httpOnly: false,
    });

    const otp = Math.floor(1000 + Math.random() * 9000);
    const response = await axios.post(
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

    const newOTPVendor = {
      vendorId: vendor._id,
      otp: {
        value: otp,
        expires: Date.now() + 5 * 60 * 1000,
      },
    };

    await Vendor.findByIdAndUpdate(vendor._id, newOTPVendor, { new: true });

    res.status(201).send({ vendor: vendor, token: token });
  } catch (error) {
    logger.error(error);
    res.status(400).send(error);
  }
});

// verify otp
router.patch("/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const vendor = await Vendor.findOne({ phone });

    if (!vendor) {
      return res.status(400).send({ message: "Phone number donot exist" });
    }

    if (vendor.otp.value != otp) {
      return res.status(400).send({ message: "Invalid OTP" });
    }

    if (vendor.otp.expires < Date.now()) {
      return res.status(400).send({ message: "OTP expired" });
    }

    vendor.otp.value = null;
    vendor.otp.expires = null;

    await vendor.save();
    res.status(200).send(vendor);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

// READ ALL
router.get("/all-vendors", async (req, res) => {
  try {
    const vendors = await Vendor.find();
    res.send(vendors);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

router.get(
  "/businesses",
  verification,
  validateRole(["vendor", "admin"]),
  async (req, res, next) => {
    try {
      const businesses = await Business.find({ vendorId: req.user._id })
        .populate("posts")
        .populate({
          path: "ratings",
          populate: {
            path: "userId",
            model: "User",
          },
        })
        .populate({ path: "category", select: "name" })
        .populate("callLeads")
        .populate("category")
        .populate("enquiries");

      res.status(201).send(businesses);
    } catch (error) {
      logger.error(error);
      res.status(500).send(error);
    }
  },
);

router.get(
  "/getAllCallLeads",
  verification,
  validateRole(["vendor", "admin"]),
  async (req, res, next) => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    try {
      const businesses = await Business.find({
        vendorId: req.user._id,
      }).populate("callLeads");

      const allCallLeads = businesses.flatMap((business) => business.callLeads);

      // Create a mapping to count leads by month
      const leadsCountByMonth = allCallLeads.reduce((acc, lead) => {
        const leadDate = new Date(lead.createdAt); // Assuming lead.date is the date property of your lead object
        const monthIndex = leadDate.getMonth();
        const monthName = months[monthIndex];

        if (!acc[monthName]) {
          acc[monthName] = 1;
        } else {
          acc[monthName]++;
        }

        return acc;
      }, {});

      // Convert the counts to the desired format
      const graphData = months.map((month) => ({
        name: month,
        Leads: leadsCountByMonth[month] || 0, // Default to 0 if there are no leads for the month
      }));
      res.status(201).json(graphData);
    } catch (error) {
      logger.error(error);
      res.status(500).send(error);
    }
  },
);

router.get("/businesses", verification, async (req, res, next) => {
  try {
    const businesses = await Business.find({ vendorId: req.user._id })
      .populate("posts")
      .populate({
        path: "ratings",
        populate: {
          path: "userId",
          model: "User",
        },
      })
      .populate({ path: "category", select: "name" })
      .populate("callLeads")
      .populate("category")
      .populate("enquiries");

    const allCallLeads = businesses.flatMap((business) => business.callLeads);
    console.log(allCallLeads);

    res.status(201).send(businesses);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

// router.get("/getAllCallLeads", verification, async (req, res, next) => {
//     const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

//     try {
//         const businesses = await Business.find({ vendorId: req.user._id }).populate("callLeads");

//         const allCallLeads = businesses.flatMap(business => business.callLeads);

//         // Create a mapping to count leads by month
//         const leadsCountByMonth = allCallLeads.reduce((acc, lead) => {
//             const leadDate = new Date(lead.createdAt); // Assuming lead.date is the date property of your lead object
//             const monthIndex = leadDate.getMonth();
//             const monthName = months[monthIndex];

//             if (!acc[monthName]) {
//                 acc[monthName] = 1;
//             } else {
//                 acc[monthName]++;
//             }

//             return acc;
//         }, {});

//         // Convert the counts to the desired format
//         const graphData = months.map(month => ({
//             name: month,
//             Leads: leadsCountByMonth[month] || 0, // Default to 0 if there are no leads for the month
//         }));

//         console.log(graphData);

//         res.status(201).json(graphData);
//     } catch (error) {
//         res.status(500).send(error);
//     }
// });

// READ ONE
router.get("/", verification, async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.user._id);
    if (!vendor) {
      return res.status(404).send();
    }
    res.send(vendor);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

// UPDATE
router.patch("/", verification, async (req, res, next) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ["name", "password", "image"];
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update),
  );

  if (!isValidOperation) {
    return res.status(400).send({ error: "Invalid updates!" });
  }

  try {
    const vendor = await Vendor.findById(req.user._id);
    if (!vendor) {
      return res.status(404).send();
    }

    if (req.body.password) {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      vendor.password = hashedPassword;
    }

    updates.forEach((update) => {
      if (update !== "password") {
        vendor[update] = req.body[update];
      }
    });

    await vendor.save();
    res.send(vendor);
  } catch (error) {
    logger.error(error);
    res.status(400).send(error);
  }
});

//DELETE
router.delete("/:id", async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) {
      return res.status(404).send({ error: "Vendor not found" });
    }
    res.status(200).send({ message: "Vendor deleted successfully" });
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

module.exports = router;
