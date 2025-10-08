import mongoose from "mongoose";
import config from "./config.js";

let instance = 0;

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoURI, {
      dbName: config.dbName,
    });
    instance++;
    console.log(`MongoDB connected to database: ${config.dbName}`);
    console.log(`Connection instance #${instance}`);
  } catch (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }
};

export default connectDB;
