const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");

const secretKey = process.env.TOKEN_KEY;

module.exports.createSecretToken = (id) => {
  return jwt.sign({ id }, secretKey, {
    expiresIn: 3 * 24 * 60 * 60,
  });
};
