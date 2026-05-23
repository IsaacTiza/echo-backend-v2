import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error("Redis max retries reached");
      return Math.min(retries * 200, 3000); // exponential backoff, max 3s
    },
  },
});

client.on("connect", () => console.log("[Redis] Connected"));
client.on("error", (err) => console.error("[Redis] Error:", err.message));
client.on("reconnecting", () => console.log("[Redis] Reconnecting..."));

await client.connect();

export default client;
