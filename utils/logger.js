const winston = require("winston");

const logLevel = "debug";

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.simple(),
  ),
  transports: [new winston.transports.Console({})],
});

module.exports = logger;
