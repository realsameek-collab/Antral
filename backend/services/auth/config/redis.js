import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;
export const redis = createClient({ url: redisUrl });

redis.on("ready", () => {
  console.log("Redis connected successfully");
});

redis.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});
