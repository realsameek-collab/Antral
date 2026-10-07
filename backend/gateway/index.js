import express from "express"
import dotenv from "dotenv"
import proxy from "express-http-proxy"
dotenv.config()

const port = process.env.PORT 

const app = express()

app.use("/auth" , proxy(process.env.AUTH_SERVICE_URL || process.env.AUTH_SERVICE))
app.use("/agent" , proxy(process.env.AGENT_SERVICE_URL || process.env.AGENT_SERVICE))
app.get("/",(req,res)=>{
    res.json({message:"Hello from gateway"})
})



const listening = () => console.log(`server started at port ${port}`)
if (process.env.ANTRAL_LOCAL_DESKTOP === "1") app.listen(port, "127.0.0.1", listening)
else app.listen(port, listening)