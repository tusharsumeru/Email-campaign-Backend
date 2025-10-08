import dotenv from "dotenv";

dotenv.config();

const env = process.env.NODE_ENV || "development";

const config = {
  development: {
    mongoURI: process.env.DEV_MONGO_URI || "mongodb://localhost:27017",
    dbName: process.env.DEV_DB_NAME || "dev_database",
  },
  test: {
    mongoURI: process.env.TEST_MONGO_URI || "mongodb://localhost:27017",
    dbName: process.env.TEST_DB_NAME || "test_database",
  },
  production: {
    mongoURI: process.env.PROD_MONGO_URI || "mongodb://localhost:27017",
    dbName: process.env.PROD_DB_NAME || "prod_database",
  },
};

export default config[env];
