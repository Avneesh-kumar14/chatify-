import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import UserService from "../services/user.service.js";
import MessageService from "../services/message.service.js";
import CacheService from "../services/cache.service.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [ENV.CLIENT_URL],
    credentials: true,
  },
});

// apply authentication middleware to all socket connections
io.use(socketAuthMiddleware);

/**
 * ============================================
 * ONLINE USERS TRACKING
 * ============================================
 * In-memory map for fast lookups within single server
 * For horizontal scaling, use Redis Pub/Sub
 */
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// this is for storing online users on this server instance
const userSocketMap = {}; // {userId: socketId}

/**
 * ============================================
 * SOCKET.IO CONNECTION HANDLER
 * ============================================
 */

io.on("connection", (socket) => {
  const userId = socket.user._id.toString();
  const userName = socket.user.fullName;

  console.log(`✅ User ${userName} (${userId}) connected with socket ${socket.id}`);

  // Store socket ID
  userSocketMap[userId] = socket.id;

  // User joins personal room for targeted messages
  socket.join(`user:${userId}`);

  // Mark as online in DB + Redis
  UserService.setOnline(userId, socket.id);

  // Broadcast online users list
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  /**
   * MESSAGE EVENTS
   */

  /**
   * Typing indicator
   * Broadcast to receiver that user is typing
   */
  socket.on("typing:start", (data) => {
    const { conversationId, receiverId } = data;

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing:start", {
        senderId: userId,
        conversationId,
      });
    }
  });

  /**
   * Stop typing indicator
   */
  socket.on("typing:stop", (data) => {
    const { conversationId, receiverId } = data;

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing:stop", {
        senderId: userId,
        conversationId,
      });
    }
  });

  /**
   * Message delivered acknowledgment
   * Receiver confirms they received the message
   */
  socket.on("message:delivered", (data) => {
    const { messageId, receiverId } = data;

    // Mark as delivered in database
    MessageService.markMessageDelivered(messageId, userId);

    // Notify sender
    const senderSocketId = getReceiverSocketId(receiverId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("message:delivered", {
        messageId,
        deliveredAt: new Date(),
      });
    }
  });

  /**
   * Message read acknowledgment
   * Receiver confirms they read the message
   */
  socket.on("message:read", (data) => {
    const { messageId, receiverId } = data;

    // Mark as read in database
    MessageService.markMessageRead(messageId, userId);

    // Notify sender
    const senderSocketId = getReceiverSocketId(receiverId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("message:read", {
        messageId,
        readAt: new Date(),
      });
    }
  });

  /**
   * Bulk mark conversation as read
   * More efficient than individual read events
   */
  socket.on("conversation:read", (data) => {
    const { otherUserId } = data;

    // Mark all messages as read
    MessageService.markConversationAsRead(userId, otherUserId);

    // Notify conversation partner
    const partnerSocketId = getReceiverSocketId(otherUserId);
    if (partnerSocketId) {
      io.to(partnerSocketId).emit("conversation:read", {
        userId,
        readAt: new Date(),
      });
    }
  });

  /**
   * PRESENCE EVENTS
   */

  /**
   * User disconnection
   * Clean up presence data
   */
  socket.on("disconnect", () => {
    console.log(`❌ User ${userName} (${userId}) disconnected`);

    delete userSocketMap[userId];

    // Mark as offline in DB + Redis
    UserService.setOffline(userId);

    // Broadcast updated online users
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  /**
   * Handle errors
   */
  socket.on("error", (error) => {
    console.error(`Socket error for user ${userId}:`, error);
  });
});

/**
 * ============================================
 * PUB/SUB FOR HORIZONTAL SCALING
 * ============================================
 * When running multiple Node instances,
 * use Redis Pub/Sub to broadcast across servers
 */

// For future: Horizontal scaling setup
// CacheService.subscribe('messages:new', (message) => {
//   io.to(`user:${message.receiverId}`).emit('newMessage', message);
// });

export { io, app, server };

