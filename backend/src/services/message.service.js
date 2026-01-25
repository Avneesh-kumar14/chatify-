import Message from "../models/Message.js";
import User from "../models/User.js";
import CacheService from "./cache.service.js";
import {
  ValidationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  RateLimitError,
} from "../lib/errors.js";
import {
  validateMessageText,
  validateImage,
  validateUserId,
  validatePagination,
} from "./validation.service.js";

/**
 * ============================================
 * MESSAGE SERVICE
 * ============================================
 * 
 * Core business logic for messaging
 * Separates concerns from controllers:
 * - Database queries
 * - Cache management
 * - Validation
 * - Business rules
 * 
 * Why service layer?
 * 1. Controllers become thin (just HTTP handling)
 * 2. Easy to reuse logic (HTTP, WebSocket, cron jobs)
 * 3. Easy to test (mock dependencies)
 * 4. Single responsibility principle
 */

export class MessageService {
  /**
   * ============================================
   * SENDING MESSAGES
   * ============================================
   */

  /**
   * Send a message from sender to receiver
   * 
   * Business logic:
   * 1. Validate inputs
   * 2. Check rate limit
   * 3. Verify receiver exists
   * 4. Save to database
   * 5. Cache for instant retrieval
   * 6. Queue if receiver offline
   * 
   * Returns: Created message document
   */
  static async sendMessage(senderId, receiverId, messageData) {
    // 1. VALIDATION
    senderId = validateUserId(senderId);
    receiverId = validateUserId(receiverId);

    // Business rule: Can't send to self
    if (senderId.toString() === receiverId.toString()) {
      throw new ValidationError("You cannot send messages to yourself");
    }

    const text = validateMessageText(messageData.text);
    const image = validateImage(messageData.image);

    // Business rule: Must have either text or image
    if (!text && !image) {
      throw new ValidationError("Message must contain either text or image");
    }

    // 2. RATE LIMITING
    const rateLimitResult = await CacheService.checkMessageRateLimit(senderId);
    if (rateLimitResult.isLimited) {
      throw new RateLimitError(rateLimitResult.retryAfter);
    }

    // 3. VERIFY RECEIVER
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      throw new NotFoundError("User", receiverId);
    }

    // 4. CREATE MESSAGE
    try {
      const newMessage = new Message({
        senderId,
        receiverId,
        text,
        image,
        status: "pending",
      });

      await newMessage.save();

      // Populate sender info for response
      const populatedMessage = await Message.findById(newMessage._id).populate(
        "senderId",
        "fullName profilePic"
      );

      // Prepare object for caching with senderIdValue
      const messageForCache = populatedMessage.toObject();
      messageForCache.senderIdValue = populatedMessage.senderId._id;
      
      // 5. CACHE MESSAGE
      // Cache for instant subsequent loads
      await CacheService.cacheMessage(
        this._getConversationId(senderId, receiverId),
        messageForCache
      );

      // 6. QUEUE IF OFFLINE
      const isReceiverOnline = await CacheService.isUserOnline(receiverId);
      if (!isReceiverOnline) {
        await CacheService.queueMessageForOfflineUser(receiverId, messageForCache);
      }

      // Add senderIdValue to the document for frontend use
      populatedMessage.senderIdValue = populatedMessage.senderId._id;
      return populatedMessage;
    } catch (err) {
      if (err.isOperational) throw err;
      console.error("Failed to create message:", err);
      throw new DatabaseError("Failed to send message");
    }
  }

  /**
   * ============================================
   * FETCHING MESSAGES
   * ============================================
   */

  /**
   * Get messages between two users
   * 
   * Optimization:
   * 1. Try Redis cache first (fast)
   * 2. Fall back to MongoDB (complete history)
   * 3. Implement cursor-based pagination (infinite scroll)
   * 
   * Why cursor-based?
   * - Offset-based: Broken when messages deleted
   * - Cursor-based: Works with deletes, better UX
   */
  static async getMessagesByUserId(userId, otherUserId, limit = 20, cursor = null) {
    userId = validateUserId(userId);
    otherUserId = validateUserId(otherUserId);
    const { limit: validLimit, cursor: validCursor } = validatePagination(limit, cursor);

    const conversationId = this._getConversationId(userId, otherUserId);

    // 1. CHECK REDIS CACHE FIRST
    // Instant load for recent messages
    if (!cursor) {
      const cachedMessages = await CacheService.getCachedMessages(conversationId, 50);
      if (cachedMessages.length > 0) {
        return {
          messages: cachedMessages.slice(0, validLimit),
          nextCursor: cachedMessages.length > validLimit ? cachedMessages[validLimit]._id : null,
          hasMore: cachedMessages.length > validLimit,
        };
      }
    }

    // 2. FALL BACK TO DATABASE
    // For initial load or scrolling to older messages
    try {
      // Build query
      const query = {
        $or: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
        deletedAt: null, // Exclude soft-deleted messages
      };

      // If cursor provided, fetch AFTER that message
      if (validCursor) {
        const cursorMessage = await Message.findById(validCursor);
        if (!cursorMessage) {
          throw new NotFoundError("Message", validCursor);
        }
        // Fetch messages newer than cursor
        query.createdAt = { $lt: cursorMessage.createdAt };
      }

      // Fetch one extra to determine if more exists
      const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(validLimit + 1)
        .populate("senderId", "fullName profilePic");

      // Add senderIdValue for frontend comparison
      const processedMessages = messages.map((msg) => {
        const msgObj = msg.toObject();
        msgObj.senderIdValue = msg.senderId._id;
        return msgObj;
      });

      const hasMore = processedMessages.length > validLimit;
      const result = processedMessages.slice(0, validLimit);

      return {
        messages: result,
        nextCursor: hasMore ? result[result.length - 1]._id : null,
        hasMore,
      };
    } catch (err) {
      if (err.isOperational) throw err;
      console.error("Failed to fetch messages:", err);
      throw new DatabaseError("Failed to fetch messages");
    }
  }

  /**
   * ============================================
   * MESSAGE STATUS TRACKING
   * ============================================
   */

  /**
   * Mark message as delivered
   * Called when receiver's client receives notification
   */
  static async markMessageDelivered(messageId, userId) {
    messageId = validateUserId(messageId);
    userId = validateUserId(userId);

    try {
      const message = await Message.findById(messageId);

      if (!message) {
        throw new NotFoundError("Message", messageId);
      }

      // Authorization: Only receiver can mark as delivered
      if (message.receiverId.toString() !== userId.toString()) {
        throw new AuthorizationError("You can only deliver your own messages");
      }

      // Update status
      if (message.status !== "delivered" && message.status !== "read") {
        message.status = "delivered";
        message.deliveredAt = new Date();
        await message.save();
      }

      return message;
    } catch (err) {
      if (err.isOperational) throw err;
      console.error("Failed to mark message delivered:", err);
      throw new DatabaseError("Failed to update message status");
    }
  }

  /**
   * Mark message as read
   * Called when receiver opens message
   */
  static async markMessageRead(messageId, userId) {
    messageId = validateUserId(messageId);
    userId = validateUserId(userId);

    try {
      const message = await Message.findById(messageId);

      if (!message) {
        throw new NotFoundError("Message", messageId);
      }

      // Authorization: Only receiver can mark as read
      if (message.receiverId.toString() !== userId.toString()) {
        throw new AuthorizationError("You can only read your own messages");
      }

      // Update status
      if (message.status !== "read") {
        message.status = "read";
        message.readAt = new Date();
        await message.save();
      }

      return message;
    } catch (err) {
      if (err.isOperational) throw err;
      console.error("Failed to mark message read:", err);
      throw new DatabaseError("Failed to update message status");
    }
  }

  /**
   * Bulk mark messages as read for conversation
   * More efficient than individual updates
   */
  static async markConversationAsRead(userId, otherUserId) {
    userId = validateUserId(userId);
    otherUserId = validateUserId(otherUserId);

    try {
      const result = await Message.updateMany(
        {
          receiverId: userId,
          senderId: otherUserId,
          status: { $in: ["pending", "sent", "delivered"] },
        },
        {
          $set: {
            status: "read",
            readAt: new Date(),
          },
        }
      );

      return { modifiedCount: result.modifiedCount };
    } catch (err) {
      console.error("Failed to mark conversation as read:", err);
      throw new DatabaseError("Failed to mark conversation as read");
    }
  }

  /**
   * ============================================
   * MESSAGE DELETION (SOFT DELETE)
   * ============================================
   */

  /**
   * Soft delete message
   * 
   * Why soft delete?
   * - Maintains referential integrity
   * - Allows recovery/undo
   * - Audit trails (who deleted what, when)
   * - Simple to exclude from queries (deletedAt = null)
   */
  static async softDeleteMessage(messageId, userId) {
    messageId = validateUserId(messageId);
    userId = validateUserId(userId);

    try {
      const message = await Message.findById(messageId);

      if (!message) {
        throw new NotFoundError("Message", messageId);
      }

      // Authorization: Only sender can delete
      if (message.senderId.toString() !== userId.toString()) {
        throw new AuthorizationError("You can only delete your own messages");
      }

      // Only allow deletion within 15 minutes
      const createdTime = new Date(message.createdAt).getTime();
      const nowTime = Date.now();
      const ageMinutes = (nowTime - createdTime) / (1000 * 60);

      if (ageMinutes > 15) {
        throw new ValidationError("Messages can only be deleted within 15 minutes");
      }

      // Mark as deleted
      message.deletedAt = new Date();
      message.deletedBy = userId;
      await message.save();

      // Clear cache
      const conversationId = this._getConversationId(message.senderId, message.receiverId);
      await CacheService.clearMessageCache(conversationId);

      return message;
    } catch (err) {
      if (err.isOperational) throw err;
      console.error("Failed to delete message:", err);
      throw new DatabaseError("Failed to delete message");
    }
  }

  /**
   * Edit message (only sender can edit within 1 hour)
   */
  static async editMessage(messageId, userId, newText) {
    messageId = validateUserId(messageId);
    userId = validateUserId(userId);
    
    // Validate new text
    newText = validateMessageText(newText);

    try {
      const message = await Message.findById(messageId);

      if (!message) {
        throw new NotFoundError("Message", messageId);
      }

      // Authorization: Only sender can edit
      if (message.senderId.toString() !== userId.toString()) {
        throw new AuthorizationError("You can only edit your own messages");
      }

      // Check if message is deleted
      if (message.deletedAt) {
        throw new ValidationError("Cannot edit a deleted message");
      }

      // Only allow editing within 24 hours (like WhatsApp)
      const createdTime = new Date(message.createdAt).getTime();
      const nowTime = Date.now();
      const ageHours = (nowTime - createdTime) / (1000 * 60 * 60);

      if (ageHours > 24) {
        throw new ValidationError("Messages can only be edited within 24 hours");
      }

      // Update message
      message.text = newText;
      message.editedAt = new Date();
      await message.save();

      // Clear cache
      const conversationId = this._getConversationId(message.senderId, message.receiverId);
      await CacheService.clearMessageCache(conversationId);

      // Populate sender info
      const populatedMessage = await Message.findById(message._id).populate(
        "senderId",
        "fullName profilePic"
      );
      
      populatedMessage.senderIdValue = populatedMessage.senderId._id;
      return populatedMessage;
    } catch (err) {
      if (err.isOperational) throw err;
      console.error("Failed to edit message:", err);
      throw new DatabaseError("Failed to edit message");
    }
  }

  /**
   * Delete entire conversation (all messages between two users)
   */
  static async deleteConversation(userId, otherUserId) {
    userId = validateUserId(userId);
    otherUserId = validateUserId(otherUserId);

    try {
      // Mark all messages in conversation as deleted
      const result = await Message.updateMany(
        {
          $or: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
        {
          $set: {
            deletedAt: new Date(),
            deletedBy: userId,
          },
        }
      );

      // Clear cache
      const conversationId = this._getConversationId(userId, otherUserId);
      await CacheService.clearMessageCache(conversationId);

      return {
        deletedCount: result.modifiedCount,
        message: `${result.modifiedCount} messages deleted`,
      };
    } catch (err) {
      if (err.isOperational) throw err;
      console.error("Failed to delete conversation:", err);
      throw new DatabaseError("Failed to delete conversation");
    }
  }

  /**
   * ============================================
   * HELPER METHODS
   * ============================================
   */

  /**
   * Generate deterministic conversation ID from two user IDs
   * Ensures same ID regardless of order: (A, B) = (B, A)
   */
  static _getConversationId(userId1, userId2) {
    const ids = [userId1.toString(), userId2.toString()].sort();
    return `${ids[0]}:${ids[1]}`;
  }

  /**
   * Get unread message count for user
   */
  static async getUnreadCount(userId) {
    userId = validateUserId(userId);

    try {
      const count = await Message.countDocuments({
        receiverId: userId,
        status: { $in: ["pending", "sent", "delivered"] },
        deletedAt: null,
      });

      return count;
    } catch (err) {
      console.error("Failed to get unread count:", err);
      return 0;
    }
  }

  /**
   * Get chat partners (users with conversation history)
   */
  static async getChatPartners(userId) {
    userId = validateUserId(userId);

    try {
      // Find all unique users who have exchanged messages
      const messages = await Message.find({
        $or: [{ senderId: userId }, { receiverId: userId }],
        deletedAt: null,
      })
        .select("senderId receiverId")
        .lean();

      const partnersSet = new Set();
      messages.forEach((msg) => {
        const partnerId =
          msg.senderId.toString() === userId.toString() ? msg.receiverId : msg.senderId;
        partnersSet.add(partnerId.toString());
      });

      // Fetch user details
      const partners = await User.find({
        _id: { $in: Array.from(partnersSet) },
      }).select("-password");

      return partners;
    } catch (err) {
      console.error("Failed to get chat partners:", err);
      throw new DatabaseError("Failed to get chat partners");
    }
  }
}

export default MessageService;
