const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const User = require("./models/User");
const Vendor = require("./models/Vendor");
const { createSecretToken } = require("./utils/SecretToken");
const app = express();
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { verification } = require("./middlewares/authorization");
const axios = require("axios");
const logger = require("./utils/logger");

logger.info("Starting app.");
dotenv.config();

const db = process.env.DB_URL;
const port = process.env.PORT;
const googleMapKey = process.env.GOOGLE_MAP_KEY;
app.use(express.json());

// Configure Multer to handle file uploads
const storage = multer.memoryStorage();

// Initialize Cloudinary (make sure to set your cloudinary configuration)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const allowedOrigins = [
  "https://www.aresuno.com",
  "www.aresuno.com",
  "aresuno.com",
  "https://aresuno.com",
  "http://localhost:5173",
  "http://localhost:3000",
]; // Add your actual allowed origins

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // If needed for cookies or authentication
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  }),
);

app.use(cookieParser());

// Connect to MongoDB database
mongoose
  .connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Start server
app.listen(port, () => {
  logger.info("Server started on port " + port);
});

// Define routes
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/api/login", async (req, res, next) => {
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
      userType: user.role,
      user: user,
      token: token,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// getUnifiedUserData
app.get("/api/userData", verification, async (req, res) => {
  try {
    let user = await User.findById(req.user._id);
    let userType = "user";
    if (!user) {
      user = await Vendor.findById(req.user._id);
      userType = "vendor";
    }
    res.status(200).json({ user: user, userType: userType });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.use("/api/logout", (req, res) => {
  res.clearCookie("token", {
    sameSite: "none",
    secure: true,
  });
  res.status(200).end();
});

app.post("/api/tokenexpired", verification, (req, res) => {
  res.status(200).end();
});

app.get("/api/getLocationFromLatLong", async (req, res) => {
  try {
    const lat = req.query.lat;
    const long = req.query.long;

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${long}&key=${googleMapKey}`,
    );

    // Check if the response contains results and results array has at least one item
    if (response.data.results && response.data.results.length > 0) {
      const location = response.data.results[0];

      // Construct the desired format from the location details
      const formattedLocation = {
        value: location.formatted_address,
        area: "", // You can set this value based on your requirements
        city:
          location.address_components.find((component) =>
            component.types.includes("locality"),
          )?.long_name || "",
        dcity:
          location.address_components.find((component) =>
            component.types.includes("administrative_area_level_2"),
          )?.long_name || "",
        state:
          location.address_components.find((component) =>
            component.types.includes("administrative_area_level_1"),
          )?.long_name || "",
        country:
          location.address_components.find((component) =>
            component.types.includes("country"),
          )?.long_name || "",
        pincode:
          location.address_components.find((component) =>
            component.types.includes("postal_code"),
          )?.long_name || "",
        lat: location.geometry.location.lat,
        long: location.geometry.location.lng,
        type: "City", // You can set this value based on your requirements
        mobicode: "in", // You can set this value based on your requirements
        isExact: 0, // You can set this value based on your requirements
      };

      logger.info(formattedLocation);
      res.json(formattedLocation);
    } else {
      res.status(404).json({
        message:
          "No location details found for the provided latitude and longitude.",
      });
    }
  } catch (error) {
    logger.error("Error fetching location details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/api/autocomplete", async (req, res) => {
  const input = req.query.input; // Get the input query parameter from the request
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${input}&key=${googleMapKey}&types=(regions)`;

  try {
    const response = await axios.get(url);
    const predictions = response.data.predictions;

    if (predictions && predictions.length > 0) {
      const placeId = predictions[0].place_id; // Get the place ID from the first prediction
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${googleMapKey}`;

      const detailsResponse = await axios.get(detailsUrl);
      const { address_components } = detailsResponse.data.result;

      // Extract required details (state, country, pin number, district, etc.)
      const extractedDetails = {
        state:
          address_components.find((component) =>
            component.types.includes("administrative_area_level_1"),
          )?.long_name || "",
        country:
          address_components.find((component) =>
            component.types.includes("country"),
          )?.long_name || "",
        postalCode:
          address_components.find((component) =>
            component.types.includes("postal_code"),
          )?.long_name || "",
        city:
          address_components.find((component) =>
            component.types.includes("locality"),
          )?.long_name || "",
        street:
          address_components.find((component) =>
            component.types.includes("route"),
          )?.long_name || "",
        building:
          address_components.find((component) =>
            component.types.includes("subpremise"),
          )?.long_name || "",
        pinNumber:
          address_components.find((component) =>
            component.types.includes("postal_code_suffix"),
          )?.long_name || "",
        placeId: placeId,

        // Add more details as needed
      };

      res.status(200).send(extractedDetails);
    } else {
      res.status(404).send({ message: "No predictions found" });
    }
  } catch (error) {
    logger.error("Error fetching details:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

//get lat, lng from address
app.get("/api/getLatLongFromAddress", async (req, res) => {
  try {
    const address = req.query.address;
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${googleMapKey}`,
    );
    const lat = response.data.results[0].geometry.location.lat;
    const lng = response.data.results[0].geometry.location.lng;
    res.json({ lat: lat, lng: lng });
  } catch (error) {
    res.status(500).send(error);
  }
});

//otp verification
app.post("/api/send-otp", async (req, res) => {
  try {
    const phone = req.body.phone;
    // sd
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

    res.json({ success: true, message: "OTP sent successfully!" });
  } catch (error) {
    logger.error("Error sending OTP:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP." });
  }
});

app.post("/api/forgetPassword-otp", async (req, res) => {
  try {
    const phone = req.body.phone;
    const otp = Math.floor(1000 + Math.random() * 9000);
    let user = await User.findOne({ phone });
    if (!user) {
      user = await Vendor.findOne({ phone });
    }

    if (!user) {
      return res.status(400).json({ message: "Phone number donot exist" });
    }

    user.otp = {
      value: otp,
      expires: Date.now() + 5 * 60 * 1000,
    };
    await user.save();
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

    res.json({ success: true, message: "OTP sent successfully!" });
  } catch (error) {
    logger.error("Error sending OTP:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP." });
  }
});

app.post("/api/forgetPassword-verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    let user = await User.findOne({ phone });
    if (!user) {
      user = await Vendor.findOne({ phone });
    }

    if (!user) {
      return res.status(400).json({ message: "Phone number donot exist" });
    }

    if (user.otp.value != otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otp.expires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    res.json({ success: true, message: "OTP verified successfully!" });
  } catch (error) {
    logger.error("Error sending OTP:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP." });
  }
});

app.patch("/api/reset-password", async (req, res) => {
  try {
    const { phone, password } = req.body;
    let user = await User.findOne({ phone });
    if (!user) {
      user = await Vendor.findOne({ phone });
    }

    if (!user) {
      return res.status(400).json({ message: "Phone number donot exist" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: "Password reset successfully!" });
  } catch (error) {
    logger.error("Error sending OTP:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to change password." });
  }
});

// Import routes
app.use("/api/business", require("./routes/Business"));
app.use("/api/user", require("./routes/User"));
app.use("/api/vendor", require("./routes/Vendor"));
app.use("/api/post", require("./routes/Post"));
app.use("/api/banner", require("./routes/Banner"));
app.use("/api/category", require("./routes/Category"));
app.use("/api/category-title", require("./routes/CategoryTitle"));
app.use("/api/rating", require("./routes/Rating"));
app.use("/api/enquiry", require("./routes/Enquiry"));
app.use("/api/call-lead", require("./routes/CallLead"));
app.use("/api/blog", require("./routes/Blog"));
app.use("/api/city", require("./routes/City"));

module.exports = app;
