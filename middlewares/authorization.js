// auth middleware
const User = require("../models/User");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const Vendor = require("../models/Vendor");

module.exports.verification = (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, process.env.TOKEN_KEY, async (err, data) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized" });
    } else {
      let user;

      if (
        req.baseUrl.includes("business") ||
        req.baseUrl.includes("rating") ||
        req.baseUrl.includes("")
      ) {
        user = await User.findById(data.id);

        if (!user) {
          user = await Vendor.findById(data.id);
          console.log("data id for vendor : " + data.id);
          console.log(user);
        }
      } else if (req.baseUrl.includes("user")) {
        console.log("in the user check if block");
        user = await User.findById(data.id);
        console.log("exit the user check if block");
      } else if (req.baseUrl.includes("vendor")) {
        console.log("in the vendor check if block");
        user = await Vendor.findById(data.id);
        console.log("exit the vendor check if block");
      }
      if (!user) {
        return res.status(404).json({ message: "User/Vendor not found" });
      }
      req.user = user; // Set the user object in the request for use in other routes/controllers

      next();
    }
  });
};

module.exports.isTokenExpired = (req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(" ")[1];
    if (token) {
      jwt.verify(token, process.env.TOKEN_KEY, (err, decoded) => {
        if (err) {
          return res.status(401).json({ message: "Unauthorized" });
        } else {
          next();
        }
      });
    } else {
      return res.status(401).json({ message: "Unauthorized" });
    }
  } else {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports.validateRole = (requiredRole) => {
  return (req, res, next) => {
    if (req.user && req.user.role === requiredRole) {
      // User has the required role, proceed to the next middleware
      next();
    } else {
      // User does not have the required role, return an error response
      res.status(403).send({ error: "Insufficient privileges." });
    }
  };
};

module.exports.validateRole = (requiredRoles) => {
  return (req, res, next) => {
    if (req.user && requiredRoles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).send({ error: "Insufficient privileges." });
    }
  };
};
