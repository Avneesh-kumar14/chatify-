import * as redis from "../lib/redis.js";
import { DatabaseError } from "../lib/errors.js";

/**
 * ============================================
 * CACHE SERVICE
 * ============================================
 * 
 * Abstracts Redis operations for the application
 * Provides a clean interface for caching logic
 * Makes it easy to swap Redis for other backends
 * 
 * Benefits:
 * - Single source of truth for cache operations
 * - Error handling centralized
 * - Monitoring/logging in one place
 * - Easy testing with mocks
 */

export class CacheService {
  /**
   * ============================================
   * USER PRESENCE MANAGEMENT
   * ============================================
   */

  /**
   * Mark user as online
   * Called when user connects via WebSocket
   */
  static async setUserOnline(userId, socketId) {
    try {
      await redis.setUserOnline(userId, socketId);
      console.log(`✅ User ${userId} online with socket ${socketId}`);
    } catch (err) {
      console.error(`❌ Failed to set user online:`, err);
      throw new DatabaseError("Failed to update user presence");
    }
  }

  /**
   * Mark user as offline
   * Called when user disconnects
   */
  static async setUserOffline(userId) {
    try {
      await redis.setUserOffline(userId);
      console.log(`✅ User ${userId} offline`);
    } catch (err) {
      console.error(`❌ Failed to set user offline:`, err);
      throw new DatabaseError("Failed to update user presence");
    }
  }

  /**
   * Get list of online users
   * Used for presence sidebar
   */
  static async getOnlineUsers() {
    try {
      const users = await redis.getOnlineUsers();
      return users || [];
    } catch (err) {
      console.error(`❌ Failed to get online users:`, err);
      // Don't throw - return empty list instead
      // Presence is non-critical, shouldn't crash the app
      return [];
    }
  }

  /**
   * Check if specific user is online
   */
  static async isUserOnline(userId) {
    try {
      return await redis.isUserOnline(userId);
    } catch (err) {
      console.error(`❌ Failed to check user online status:`, err);
      return false; // Assume offline if error
    }
  }

  /**
   * Get user's last seen timestamp
   * Used for "Active 2 hours ago" text
   */
  static async getUserLastSeen(userId) {
    try {
      return await redis.getUserLastSeen(userId);
    } catch (err) {
      console.error(`❌ Failed to get user last seen:`, err);
      return null;
    }
  }

  /**
   * ============================================
   * MESSAGE CACHING
   * ============================================
   */

  /**
   * Cache recently sent message
   * Stores in Redis for instant access
   * Falls back to MongoDB for older messages
   */
  static async cacheMessage(conversationId, message) {
    try {
      await redis.cacheMessage(conversationId, message);
    } catch (err) {
      console.error(`❌ Failed to cache message:`, err);
      // Non-critical, continue without cache
    }
  }

  /**
   * Get cached messages for conversation
   * Returns ~50 most recent messages
   */
  static async getCachedMessages(conversationId, limit = 50) {
    try {
      return await redis.getCachedMessages(conversationId, limit);
    } catch (err) {
      console.error(`❌ Failed to get cached messages:`, err);
      return []; // Return empty, caller will fetch from DB
    }
  }

  /**
   * Clear message cache
   * Called when message is deleted or edited
   */
  static async clearMessageCache(conversationId) {
    try {
      await redis.clearMessageCache(conversationId);
    } catch (err) {
      console.error(`❌ Failed to clear message cache:`, err);
      // Non-critical
    }
  }

  /**
   * ============================================
   * OFFLINE MESSAGE QUEUING
   * ============================================
   * Queue messages for users who are offline
   * Deliver when they reconnect
   */

  /**
   * Add message to offline queue
   * Called when user is not connected
   */
  static async queueMessageForOfflineUser(userId, message) {
    try {
      await redis.queueMessageForOfflineUser(userId, message);
    } catch (err) {
      console.error(`❌ Failed to queue offline message:`, err);
      // Non-critical, message is in DB
    }
  }

  /**
   * Get and clear queued messages
   * Called when user reconnects
   */
  static async getOfflineMessages(userId) {
    try {
      return await redis.getAndClearOfflineMessages(userId);
    } catch (err) {
      console.error(`❌ Failed to get offline messages:`, err);
      return [];
    }
  }

  /**
   * ============================================
   * RATE LIMITING
   * ============================================
   * Prevent spam and abuse
   * Atomic increment ensures accuracy
   */

  /**
   * Check message rate limit
   * Max 50 messages per minute per user
   */
  static async checkMessageRateLimit(userId) {
    const maxRequests = 50;
    const windowSeconds = 60;
    return this.checkRateLimit(`messages:${userId}`, maxRequests, windowSeconds);
  }

  /**
   * Check login attempt rate limit
   * Max 5 attempts per 5 minutes per IP
   */
  static async checkLoginRateLimit(ipAddress) {
    const maxRequests = 5;
    const windowSeconds = 300;
    return this.checkRateLimit(`login:${ipAddress}`, maxRequests, windowSeconds);
  }

  /**
   * Check file upload rate limit
   * Max 10 uploads per hour per user
   */
  static async checkFileUploadRateLimit(userId) {
    const maxRequests = 10;
    const windowSeconds = 3600;
    return this.checkRateLimit(`uploads:${userId}`, maxRequests, windowSeconds);
  }

  /**
   * Generic rate limit check
   */
  static async checkRateLimit(key, maxRequests, windowSeconds) {
    try {
      const result = await redis.checkRateLimit(key, maxRequests, windowSeconds);
      return result;
    } catch (err) {
      console.error(`❌ Failed to check rate limit:`, err);
      // Fail open: allow request if Redis down
      // Better UX than hard blocking
      return { count: 1, isLimited: false, remaining: maxRequests - 1 };
    }
  }

  /**
   * Reset rate limit (for testing)
   */
  static async resetRateLimit(key) {
    try {
      await redis.resetRateLimit(key);
    } catch (err) {
      console.error(`❌ Failed to reset rate limit:`, err);
    }
  }

  /**
   * ============================================
   * TOKEN/SESSION MANAGEMENT
   * ============================================
   */

  /**
   * Blacklist token on logout
   * Prevents reuse of old tokens
   */
  static async blacklistToken(jti, expiresInSeconds) {
    try {
      await redis.blacklistToken(jti, expiresInSeconds);
    } catch (err) {
      console.error(`❌ Failed to blacklist token:`, err);
      throw new DatabaseError("Failed to logout");
    }
  }

  /**
   * Check if token is blacklisted
   */
  static async isTokenBlacklisted(jti) {
    try {
      return await redis.isTokenBlacklisted(jti);
    } catch (err) {
      console.error(`❌ Failed to check token blacklist:`, err);
      // Fail secure: treat as blacklisted if error
      return true;
    }
  }

  /**
   * ============================================
   * GENERIC KEY-VALUE OPERATIONS
   * ============================================
   */

  /**
   * Set a value with optional expiry
   */
  static async set(key, value, expirySeconds = null) {
    try {
      await redis.setValue(key, value, expirySeconds);
    } catch (err) {
      console.error(`❌ Failed to set key ${key}:`, err);
      throw new DatabaseError("Cache operation failed");
    }
  }

  /**
   * Get a value
   */
  static async get(key) {
    try {
      return await redis.getValue(key);
    } catch (err) {
      console.error(`❌ Failed to get key ${key}:`, err);
      return null;
    }
  }

  /**
   * Delete keys
   */
  static async delete(keys) {
    try {
      await redis.deleteKey(keys);
    } catch (err) {
      console.error(`❌ Failed to delete keys:`, err);
    }
  }

  /**
   * ============================================
   * PUB/SUB FOR HORIZONTAL SCALING
   * ============================================
   * Broadcast events across all servers
   */

  /**
   * Subscribe to a channel
   * Used when multiple servers need to coordinate
   */
  static subscribe(channel, handler) {
    try {
      redis.subscribe(channel, handler);
      console.log(`✅ Subscribed to channel: ${channel}`);
    } catch (err) {
      console.error(`❌ Failed to subscribe to channel ${channel}:`, err);
    }
  }

  /**
   * Publish to a channel
   */
  static async publish(channel, message) {
    try {
      const numSubscribers = await redis.publish(channel, message);
      if (numSubscribers > 0) {
        console.log(`📢 Published to ${channel} (${numSubscribers} subscribers)`);
      }
      return numSubscribers;
    } catch (err) {
      console.error(`❌ Failed to publish to ${channel}:`, err);
      return 0;
    }
  }

  /**
   * Unsubscribe from channel
   */
  static unsubscribe(channel) {
    try {
      redis.unsubscribe(channel);
      console.log(`✅ Unsubscribed from channel: ${channel}`);
    } catch (err) {
      console.error(`❌ Failed to unsubscribe from ${channel}:`, err);
    }
  }
}

export default CacheService;
