import redis from "redis";
import { ENV } from "./env.js";

/**
 * Redis Client Service
 * 
 * Used for:
 * 1. Online users tracking (O(1) lookups)
 * 2. Message delivery queue (for offline users)
 * 3. Temporary message caching
 * 4. Rate limiting (anti-spam)
 * 5. Session/token management
 * 6. Pub/Sub for horizontal scaling
 * 
 * Why Redis > Database?
 * - Database: Slow (O(n) scans), causes disk I/O
 * - Redis: Fast (O(1) operations), in-memory
 * - Cache loss is acceptable (can rebuild from sockets)
 * - Perfect for real-time data that needs atomic operations
 */

// Create Redis client (Redis v5 API - uses promises)
const redisClient = redis.createClient({
  socket: {
    host: ENV.REDIS_HOST || "localhost",
    port: ENV.REDIS_PORT || 6379,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        // Silent - stop reconnecting after 10 attempts
        return false;
      }
      return Math.min(retries * 50, 500);
    },
  },
  password: ENV.REDIS_PASSWORD || undefined,
});

// Track connection status
let isRedisConnected = false;

// Error handling - suppress verbose logs
redisClient.on("error", (err) => {
  // Silent error handling - we'll handle this gracefully
  isRedisConnected = false;
});

redisClient.on("connect", () => {
  isRedisConnected = true;
});

redisClient.on("ready", () => {
  isRedisConnected = true;
});

redisClient.on("end", () => {
  isRedisConnected = false;
});

// Connect to Redis (non-blocking)
redisClient.connect().then(() => {
  isRedisConnected = true;
}).catch(() => {
  // Silent - Redis not available, using in-memory fallback
  isRedisConnected = false;
});

/**
 * ============================================
 * 1. ONLINE USERS TRACKING
 * ============================================
 */

/**
 * Add user to online set
 * Time: O(1)
 */
export const setUserOnline = async (userId, socketId) => {
  if (!isRedisConnected) return;
  try {
    // Add to online set (for presence listing)
    await redisClient.sAdd("online_users", userId);

    // Store user metadata (status, socketId, timestamp)
    await redisClient.hSet(`user:${userId}`, {
      status: "online",
      socketId,
      lastSeen: Date.now().toString(),
    });
  } catch (err) {
    console.warn("Failed to set user online in Redis:", err.message);
  }
};

/**
 * Remove user from online set
 * Time: O(1)
 */
export const setUserOffline = async (userId) => {
  if (!isRedisConnected) return;
  try {
    await redisClient.sRem("online_users", userId);
    await redisClient.hSet(`user:${userId}`, {
      status: "offline",
      lastSeen: Date.now().toString(),
    });
  } catch (err) {
    console.warn("Failed to set user offline in Redis:", err.message);
  }
};

/**
 * Get all online user IDs
 * Time: O(n) where n = online users
 * Note: For massive scale (1M+ users), use Redis cluster or pagination
 */
export const getOnlineUsers = async () => {
  if (!isRedisConnected) return [];
  try {
    const users = await redisClient.sMembers("online_users");
    return users || [];
  } catch (err) {
    console.warn("Failed to get online users from Redis:", err.message);
    return [];
  }
};

/**
 * Check if user is online
 * Time: O(1)
 */
export const isUserOnline = async (userId) => {
  if (!isRedisConnected) return false;
  try {
    const isMember = await redisClient.sIsMember("online_users", userId);
    return isMember;
  } catch (err) {
    console.warn("Failed to check user online status:", err.message);
    return false;
  }
};

/**
 * Get user's last seen timestamp
 * Time: O(1)
 */
export const getUserLastSeen = async (userId) => {
  if (!isRedisConnected) return null;
  try {
    const lastSeen = await redisClient.hGet(`user:${userId}`, "lastSeen");
    return lastSeen ? parseInt(lastSeen) : null;
  } catch (err) {
    console.warn("Failed to get user last seen:", err.message);
    return null;
  }
};

/**
 * ============================================
 * 2. MESSAGE DELIVERY QUEUE
 * ============================================
 * When user is offline, queue messages temporarily
 * On reconnect, deliver all queued messages
 * TTL: 24 hours (messages older than this are discarded)
 */

/**
 * Add message to offline user's queue
 * Time: O(1)
 */
export const queueMessageForOfflineUser = async (userId, message) => {
  if (!isRedisConnected) return;
  try {
    const key = `messageQueue:${userId}`;
    const messageStr = JSON.stringify(message);

    // LPUSH: add to queue
    await redisClient.lPush(key, messageStr);

    // EXPIRE: auto-cleanup after 24 hours
    await redisClient.expire(key, 86400);
  } catch (err) {
    console.warn("Failed to queue message for offline user:", err.message);
  }
};

/**
 * Get and clear all queued messages for user
 * Time: O(n) where n = queued messages (usually < 1000)
 */
export const getAndClearOfflineMessages = async (userId) => {
  if (!isRedisConnected) return [];
  try {
    const key = `messageQueue:${userId}`;

    // LRANGE: get all messages
    const messages = await redisClient.lRange(key, 0, -1);

    // DEL: clear queue
    await redisClient.del(key);

    return (messages || []).map((msg) => JSON.parse(msg));
  } catch (err) {
    console.warn("Failed to get offline messages:", err.message);
    return [];
  }
};

/**
 * ============================================
 * 3. TEMPORARY MESSAGE CACHING
 * ============================================
 * Cache recent messages for instant loading
 * Fallback to MongoDB if older messages needed
 * TTL: 1 hour
 */

/**
 * Cache message temporarily
 * Using sorted set: score = timestamp (for sorting)
 * Time: O(log n)
 */
export const cacheMessage = async (conversationId, message) => {
  if (!isRedisConnected) return;
  try {
    const key = `messages:${conversationId}`;
    // Convert to timestamp number - handle both Date objects and timestamps
    const timestamp = message.createdAt instanceof Date 
      ? message.createdAt.getTime() 
      : (typeof message.createdAt === 'string' ? new Date(message.createdAt).getTime() : Date.now());
    const messageStr = JSON.stringify(message);

    // ZADD: add to sorted set with timestamp as score (must be a number)
    await redisClient.zAdd(key, { score: timestamp, value: messageStr });

    // EXPIRE: auto-cleanup after 1 hour
    await redisClient.expire(key, 3600);
  } catch (err) {
    console.warn("Failed to cache message:", err.message);
  }
};

/**
 * Get cached messages (recent messages only)
 * Time: O(log n + k) where k = returned messages
 */
export const getCachedMessages = async (conversationId, limit = 50) => {
  if (!isRedisConnected) return [];
  try {
    const key = `messages:${conversationId}`;

    // zRange with REV option: get last N messages (reversed = newest first)
    const messages = await redisClient.zRange(key, 0, limit - 1, { REV: true });

    return (messages || []).map((msg) => JSON.parse(msg));
  } catch (err) {
    console.warn("Failed to get cached messages:", err.message);
    return [];
  }
};

/**
 * Clear message cache for conversation
 * Time: O(1)
 */
export const clearMessageCache = async (conversationId) => {
  if (!isRedisConnected) return;
  try {
    await redisClient.del(`messages:${conversationId}`);
  } catch (err) {
    console.warn("Failed to clear message cache:", err.message);
  }
};

/**
 * ============================================
 * 4. RATE LIMITING (ANTI-SPAM)
 * ============================================
 * Increment counter for each request
 * Reject if exceeds threshold
 * Auto-expires after time window
 * 
 * Examples:
 * - Max 50 messages per minute per user
 * - Max 5 login attempts per minute per IP
 * - Max 10 file uploads per hour per user
 */

/**
 * Check and increment rate limit counter
 * Time: O(1)
 * 
 * Returns: { count: number, isLimited: boolean, retryAfter: number }
 */
export const checkRateLimit = async (key, maxRequests, windowSeconds) => {
  if (!isRedisConnected) return { count: 0, isLimited: false, retryAfter: 0, remaining: maxRequests };
  try {
    const limitKey = `rateLimit:${key}`;

    // INCR: atomic increment
    const count = await redisClient.incr(limitKey);

    // Set expiry only on first request
    if (count === 1) {
      await redisClient.expire(limitKey, windowSeconds);
    }

    const isLimited = count > maxRequests;
    const retryAfter = isLimited ? windowSeconds : 0;

    return {
      count,
      isLimited,
      retryAfter,
      remaining: Math.max(0, maxRequests - count),
    };
  } catch (err) {
    console.warn("Failed to check rate limit:", err.message);
    return { count: 0, isLimited: false, retryAfter: 0, remaining: maxRequests };
  }
};

/**
 * Reset rate limit counter (useful for testing)
 * Time: O(1)
 */
export const resetRateLimit = async (key) => {
  if (!isRedisConnected) return;
  try {
    await redisClient.del(`rateLimit:${key}`);
  } catch (err) {
    console.warn("Failed to reset rate limit:", err.message);
  }
};

/**
 * ============================================
 * 5. SESSION/TOKEN MANAGEMENT
 * ============================================
 * Blacklist tokens on logout
 * Store refresh token sessions
 */

/**
 * Blacklist JWT token (for logout)
 * Time: O(1)
 */
export const blacklistToken = async (jti, expiresIn) => {
  if (!isRedisConnected) return;
  try {
    const key = `blacklist:${jti}`;
    // Set a dummy value with expiry = token expiry time
    await redisClient.setEx(key, expiresIn, "true");
  } catch (err) {
    console.warn("Failed to blacklist token:", err.message);
  }
};

/**
 * Check if token is blacklisted
 * Time: O(1)
 */
export const isTokenBlacklisted = async (jti) => {
  if (!isRedisConnected) return false;
  try {
    const exists = await redisClient.exists(`blacklist:${jti}`);
    return exists === 1;
  } catch (err) {
    console.warn("Failed to check token blacklist:", err.message);
    return false;
  }
};

/**
 * ============================================
 * 6. PUB/SUB FOR HORIZONTAL SCALING
 * ============================================
 * Broadcast events across all servers
 * Essential when running multiple Node instances
 */

const subscriber = redis.createClient({
  socket: {
    host: ENV.REDIS_HOST || "localhost",
    port: ENV.REDIS_PORT || 6379,
  },
  password: ENV.REDIS_PASSWORD || undefined,
});

// Store subscription handlers
const subscriptions = {};

// Connect subscriber (non-blocking - silent)
subscriber.connect().catch(() => {
  // Silent - Redis not available, pub/sub disabled
});

/**
 * Subscribe to a channel
 * Time: O(1)
 */
export const subscribe = async (channel, handler) => {
  if (!isRedisConnected) return;
  try {
    if (!subscriptions[channel]) {
      subscriptions[channel] = [];
      
      await subscriber.subscribe(channel, (message) => {
        if (subscriptions[channel]) {
          subscriptions[channel].forEach((h) => h(JSON.parse(message)));
        }
      });
      console.log(`✅ Subscribed to Redis channel: ${channel}`);
    }

    subscriptions[channel].push(handler);
  } catch (err) {
    console.warn(`Failed to subscribe to ${channel}:`, err.message);
  }
};

/**
 * Publish message to channel
 * Time: O(n) where n = subscribers
 */
export const publish = async (channel, message) => {
  if (!isRedisConnected) return 0;
  try {
    const numSubscribers = await redisClient.publish(channel, JSON.stringify(message));
    return numSubscribers;
  } catch (err) {
    console.warn("Failed to publish message:", err.message);
    return 0;
  }
};

/**
 * Unsubscribe from channel
 * Time: O(1)
 */
export const unsubscribe = async (channel) => {
  if (!isRedisConnected) return;
  try {
    await subscriber.unsubscribe(channel);
    delete subscriptions[channel];
  } catch (err) {
    console.warn(`Failed to unsubscribe from ${channel}:`, err.message);
  }
};

/**
 * ============================================
 * UTILITY FUNCTIONS
 * ============================================
 */

/**
 * Get value by key
 * Time: O(1)
 */
export const getValue = async (key) => {
  try {
    return await redisClient.get(key);
  } catch (err) {
    console.error("Failed to get value:", err);
    return null;
  }
};

/**
 * Set value with optional expiry
 * Time: O(1)
 */
export const setValue = async (key, value, expirySeconds = null) => {
  try {
    if (expirySeconds) {
      await redisClient.setEx(key, expirySeconds, value);
    } else {
      await redisClient.set(key, value);
    }
  } catch (err) {
    console.error("Failed to set value:", err);
    throw err;
  }
};

/**
 * Delete key(s)
 * Time: O(k) where k = number of keys
 */
export const deleteKey = async (keys) => {
  try {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    if (keyArray.length > 0) {
      await redisClient.del(keyArray);
    }
  } catch (err) {
    console.error("Failed to delete key:", err);
    throw err;
  }
};

/**
 * Flush all data (BE CAREFUL - only for testing)
 * Time: O(n) where n = all keys
 */
export const flushAll = async () => {
  try {
    await redisClient.flushAll();
    console.warn("⚠️ Redis flushed - all data deleted");
  } catch (err) {
    console.error("Failed to flush Redis:", err);
    throw err;
  }
};

export default redisClient;
