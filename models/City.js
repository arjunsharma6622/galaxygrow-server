const mongoose = require("mongoose");

const CitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    index: "2dsphere",
  },
});

module.exports = mongoose.model("City", CitySchema);
