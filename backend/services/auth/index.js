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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// A brief Redis outage at startup used to exit the process, and nodemon then
// waits for a file change, so the service stayed down ("Couldn't load your
// profile"). Keep retrying instead; node-redis reconnects by itself once up.
const connectRedis = async () => {
    for (let attempt = 1; ; attempt += 1) {
        try {
            await redis.connect()
            return
        } catch (error) {
            const delay = Math.min(1000 * 2 ** (attempt - 1), 15000)
            console.error(`Redis not reachable (attempt ${attempt}): ${error.message}. Retrying in ${delay / 1000}s…`)
            if (redis.isOpen) await redis.disconnect().catch(() => {})
            await wait(delay)
        }
    }
}

const start = async () => {
    if (!process.env.REDIS_URL) {
        throw new Error("REDIS_URL is not set. Cannot start the auth service.")
    }
    await connectRedis()
    await connectDb()
    app.listen(port, () => {
        console.log(`server started at ${port}`)
    }).on("error", (error) => {
        console.error(`Auth service could not listen on port ${port}:`, error.message)
        process.exitCode = 1
    })
}

start().catch((error) => {
    console.error("Failed to start auth service:", error.message)
    process.exitCode = 1
})
