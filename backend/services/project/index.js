import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
dotenv.config();

const port = process.env.PORT;

const app = express();



app.listen(port, async () => {
    console.log(`Project service is running on port ${port}`);
    await connectDb(); 
});