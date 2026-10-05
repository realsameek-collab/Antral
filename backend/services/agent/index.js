import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDb from "./config/db.js";
import { redis } from "./config/redis.js";
import consentRoutes from "./routes/consent.routes.js";
import agentRoutes from "./routes/agent.routes.js";
import { markInterruptedRuns } from "./lib/agent/orchestrator.js";

const port = process.env.PORT;

const app = express();

// Behind the gateway proxy; trust it so req IP reflects the real client.
app.set("trust proxy", true);
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "64kb" }));

app.get("/", (_req, res) => {
  res.json({ message: "Hello from agent" });
});

app.use(consentRoutes);
app.use(agentRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

const start = async () => {
  await redis.connect();
  await connectDb();
  await markInterruptedRuns().catch((e) => console.error("Could not mark interrupted runs:", e.message));
  app.listen(port, () => {
    console.log(`agent service is running on port ${port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start agent service:", error.message);
  process.exitCode = 1;
});
