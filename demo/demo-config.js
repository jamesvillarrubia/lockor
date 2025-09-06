// Demo configuration file for Lockor extension
// This file will be locked to demonstrate AI protection

const config = {
  apiKey: "demo-api-key-12345",
  database: {
    host: "localhost",
    port: 5432,
    name: "demo_db"
  },
  features: {
    authentication: true,
    logging: true,
    caching: false
  }
};

module.exports = config;
