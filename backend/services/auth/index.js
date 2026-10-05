import "dotenv/config";
import express from "express";
import connectDb from "./config/db.js"
import { redis } from "./config/redis.js"
import authRoutes from "./routes/auth.routes.js"

const port = process.env.PORT

const app = express()

app.use(express.json({ limit: "10kb" }))

app.get("/",(req,res)=>{
    res.json({message:"Hello from auth"})
})

app.use(authRoutes)

app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).json({ message: "Something went wrong. Please try again." })
})

const start = async () => {
    if (!process.env.REDIS_URL) {
        throw new Error("REDIS_URL is not set. Cannot start the auth service.")
    }
    await redis.connect()
    await connectDb()
    app.listen(port, () => {
        console.log(`server started at ${port}`)
    })
}

start().catch((error) => {
    console.error("Failed to start auth service:", error.message)
    process.exitCode = 1
})
