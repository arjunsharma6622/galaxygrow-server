const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const { createSecretToken } = require("../utils/SecretToken");
const { verification, validateRole } = require("../middlewares/authorization");
const axios = require("axios");
const logger = require("../utils/logger");

// CREATE
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, gender, place, image, role } =
      req.body;

    // const vendorExists = await Vendor.findOne({ email: email });
    const userExistsWithEmail = await User.findOne({ email: email });
    const userExistsWithPhone = await User.findOne({ phone: phone });

    if (userExistsWithEmail || userExistsWithPhone) {
      return res.status(400).send({
        message: "Email or Phone number already in use for registration.",
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      gender,
      place,
      image,
      role,
    });

    await user.save();
    const token = createSecretToken(user._id);
    res.cookie("token", token, {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: "none",
      secure: true,
      withCredentials: true,
      httpOnly: false,
    });

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

    const newOTPUser = {
      otp: {
        value: otp,
        expires: Date.now() + 5 * 60 * 1000,
      },
    };

    await User.findByIdAndUpdate(user._id, newOTPUser, { new: true });

    res.status(201).send({ user: user, token: token });
  } catch (error) {
    logger.error(error);
    res.status(400).send(error);
  }
});

// verify otp
router.patch("/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).send({ message: "Phone number donot exist" });
    }

    if (user.otp.value != otp) {
      return res.status(400).send({ message: "Invalid OTP" });
    }

    if (user.otp.expires < Date.now()) {
      return res.status(400).send({ message: "OTP expired" });
    }

    user.otp.value = null;
    user.otp.expires = null;

    await user.save();
    res.status(200).send(user);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Determine if the provided input is an email or phone number
    const isEmail = /\S+@\S+\.\S+/.test(email);
    const isPhone = /^\d{10}$/.test(email);

    let user;
    if (isEmail) {
      user = await User.findOne({ email });
    } else if (isPhone) {
      user = await User.findOne({ phone: email });
    }

    if (!user) {
      return res
        .status(400)
        .json({ message: "Incorrect email or phone number or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ message: "Incorrect email or phone number or password" });
    }

    const token = createSecretToken(user._id);
    res.status(200).json({
      message: "Logged in successfully",
      success: true,
      user: user,
      token: token,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// READ ALL
router.get(
  "/all-users",
  verification,
  validateRole(["admin"]),
  async (req, res) => {
    try {
      const users = await User.find({ role: "user" });
      res.send(users);
    } catch (error) {
      logger.error(error);
      res.status(500).send(error);
    }
  },
);

// READ ALL
router.get(
  "/all-vendors",
  verification,
  validateRole(["admin"]),
  async (req, res) => {
    try {
      const vendors = await User.find({ role: "vendor" });
      res.send(vendors);
    } catch (error) {
      logger.error(error);
      res.status(500).send(error);
    }
  },
);

// READ ONE
router.get("/", verification, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).send();
    }
    res.send(user);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

// UPDATE
router.patch("/", verification, async (req, res, next) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ["name", "place", "password", "image"];
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update),
  );

  if (!isValidOperation) {
    return res.status(400).send({ error: "Invalid updates!" });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).send();
    }

    if (req.body.password) {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      user.password = hashedPassword;
    }

    updates.forEach((update) => {
      if (update !== "password") {
        user[update] = req.body[update];
      }
    });

    await user.save();
    res.send(user);
  } catch (error) {
    logger.error(error);
    res.status(400).send(error);
  }
});

//DELETE
router.delete(
  "/:id",
  verification,
  validateRole(["admin", "user", "vendor"]),
  async (req, res, next) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) {
        return res.status(404).send({ error: "User not found" });
      }
      res.status(200).send({ message: "User deleted successfully" });
    } catch (error) {
      logger.error(error);
      res.status(500).send(error);
    }
  },
);

module.exports = router;
