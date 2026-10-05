import express from "express";
import dotenv from "dotenv"
import connectDb from "./config/db.js"
import authRoutes from "./routes/auth.routes.js"

dotenv.config()

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

app.listen(port , ()=>{
    console.log(`server started at ${port}`)
    connectDb()
})
