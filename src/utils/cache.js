import redis from "../config/redis.js";

const DEFAULT_TTL = 60 * 60 * 24; // 24 hours

export const getCache = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null; // Redis failure never breaks the app
  }
};

export const setCache = async (key, value, ttl = DEFAULT_TTL) => {
  try {
    await redis.set(key, JSON.stringify(value), { EX: ttl });
  } catch (err) {
    console.error("[Cache] Set failed:", err.message);
  }
};

export const deleteCache = async (key) => {
  try {
    await redis.del(key);
  } catch (err) {
    console.error("[Cache] Delete failed:", err.message);
  }
};
