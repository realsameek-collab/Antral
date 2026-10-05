import mongoose from "mongoose";
import dns from "node:dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const connectDb = async () => {
    const mongoUrl = process.env.MONGODB_URL;
    if (!mongoUrl) {
        console.error("MONGODB_URL is not set. Cannot connect to MongoDB.");
        return;
    }

    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(mongoUrl);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
};

export default connectDb;