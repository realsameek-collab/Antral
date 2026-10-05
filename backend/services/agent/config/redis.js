import Redis from "ioredis";

// Connects to the same Redis instance the auth service writes sessions to, so
// the agent service can read `session:<id>` and identify the logged-in user.
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl, { lazyConnect: true });

redis.on("ready", () => {
  console.log("Redis connected successfully");
});

redis.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});
