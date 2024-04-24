const router = require("express").Router();
const { verification, validateRole } = require("../middlewares/authorization");
const City = require("../models/City");
const logger = require("../utils/logger");

//get all cities
router.get("/", async (req, res) => {
  try {
    const cities = await City.find({});
    res.send(cities).status(200);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

//get city by name
router.get("/:cityName", async (req, res) => {
  try {
    const city = await City.findOne({ name: req.params.cityName });
    if (!city) {
      return res.status(404).send("City not found");
    }
    res.send(city).status(200);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

//add city data
router.post("/add", verification, validateRole(["admin"]), async (req, res) => {
  try {
    const newCity = new City(req.body);
    await newCity.save();
    res.status(201).send(newCity);
  } catch (error) {
    logger.error(error);
    res.status(400).send(error);
  }
});

//update city data
router.put("/:id", verification, validateRole(["admin"]), async (req, res) => {
  try {
    const city = await City.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!city) {
      return res.status(404).send("City not found");
    }
    res.send(city).status(200);
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

//delete city data
router.delete(
  "/:id",
  verification,
  validateRole(["admin"]),
  async (req, res) => {
    try {
      const city = await City.findByIdAndDelete(req.params.id);
      if (!city) {
        return res.status(404).send("City not found");
      }
      res.send(city).status(200);
    } catch (error) {
      logger.error(error);
      res.status(500).send(error);
    }
  },
);

module.exports = router;
