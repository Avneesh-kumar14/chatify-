import { getReceiverSocketId, io } from "../lib/socket.js";
import User from "../models/User.js";
import MessageService from "../services/message.service.js";
import UserService from "../services/user.service.js";
import CacheService from "../services/cache.service.js";
import { asyncHandler } from "../lib/errors.js";

/**
 * ============================================
 * MESSAGE CONTROLLER
 * ============================================
 * 
 * Thin HTTP handler layer
 * Business logic delegated to services
 * Benefits:
 * - Easy to test (mock services)
 * - Easy to extend (add WebSocket handler with same service)
 * - Consistent error handling (via asyncHandler)
 */

/**
 * Get all contacts (all users except self)
 */
export const getAllContacts = asyncHandler(async (req, res) => {
  const users = await UserService.getAllUsers(req.user._id);
  
  res.status(200).json({
    success: true,
    data: users,
    message: "Contacts fetched successfully",
  });
});

/**
 * Get messages between two users
 * Implements pagination with cursor
 */
export const getMessagesByUserId = asyncHandler(async (req, res) => {
  const { id: otherUserId } = req.params;
  const { limit = 20, cursor } = req.query;

  const result = await MessageService.getMessagesByUserId(
    req.user._id,
    otherUserId,
    limit,
    cursor
  );

  res.status(200).json({
    success: true,
    data: result.messages,
    pagination: {
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      limit: parseInt(limit) || 20,
    },
    message: "Messages fetched successfully",
  });
});

/**
 * Send message
 * 
 * Flow:
 * 1. Service validates & creates message
 * 2. Controller broadcasts via WebSocket
 * 3. Client receives via HTTP response
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { text, image } = req.body;
  const { id: receiverId } = req.params;

  // Service handles all validation, rate limiting, DB operations
  const newMessage = await MessageService.sendMessage(
    req.user._id,
    receiverId,
    { text, image }
  );

  // Update message status to "sent" before sending response
  newMessage.status = "sent";
  await newMessage.save();

  // Convert to object for response (includes senderIdValue)
  const messageObj = newMessage.toObject();

  // WEBSOCKET: Broadcast to receiver (if online)
  // Receiver's client will deduplicate if already received via HTTP
  const receiverSocketId = getReceiverSocketId(receiverId);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", {
      ...messageObj,
      status: "delivered", // Mark as delivered immediately if receiver is online
    });
  }

  res.status(201).json({
    success: true,
    data: messageObj,
    message: "Message sent successfully",
  });
});

/**
 * Get chat partners (users with active conversations)
 */
export const getChatPartners = asyncHandler(async (req, res) => {
  const chatPartners = await MessageService.getChatPartners(req.user._id);

  res.status(200).json({
    success: true,
    data: chatPartners,
    message: "Chat partners fetched successfully",
  });
});

/**
 * Get unread message count
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await MessageService.getUnreadCount(req.user._id);

  res.status(200).json({
    success: true,
    data: { unreadCount },
    message: "Unread count fetched successfully",
  });
});

/**
 * Mark message as read
 */
export const markMessageAsRead = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await MessageService.markMessageRead(messageId, req.user._id);

  // Broadcast to sender that message was read
  const senderSocketId = getReceiverSocketId(message.senderId.toString());
  if (senderSocketId) {
    io.to(senderSocketId).emit("messageRead", {
      messageId: message._id,
      readAt: message.readAt,
    });
  }

  res.status(200).json({
    success: true,
    data: message,
    message: "Message marked as read",
  });
});

/**
 * Mark all messages in conversation as read
 */
export const markConversationAsRead = asyncHandler(async (req, res) => {
  const { otherUserId } = req.params;

  const result = await MessageService.markConversationAsRead(
    req.user._id,
    otherUserId
  );

  // Broadcast to conversation partner
  const partnerSocketId = getReceiverSocketId(otherUserId);
  if (partnerSocketId) {
    io.to(partnerSocketId).emit("conversationRead", {
      userId: req.user._id,
      readAt: new Date(),
    });
  }

  res.status(200).json({
    success: true,
    data: result,
    message: "Conversation marked as read",
  });
});

/**
 * Edit message (only sender can edit within 1 hour)
 */
export const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { text } = req.body;

  const editedMessage = await MessageService.editMessage(
    messageId,
    req.user._id,
    text
  );

  // Broadcast edit to conversation partner
  const receiverSocketId = getReceiverSocketId(editedMessage.receiverId.toString());
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("messageEdited", {
      messageId: editedMessage._id,
      text: editedMessage.text,
      editedAt: editedMessage.editedAt,
    });
  }

  res.status(200).json({
    success: true,
    data: editedMessage,
    message: "Message edited successfully",
  });
});

/**
 * Delete message (soft delete)
 */
export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const deletedMessage = await MessageService.softDeleteMessage(
    messageId,
    req.user._id
  );

  // Broadcast deletion to conversation partner
  const receiverSocketId = getReceiverSocketId(deletedMessage.receiverId.toString());
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("messageDeleted", {
      messageId: deletedMessage._id,
    });
  }

  res.status(200).json({
    success: true,
    data: deletedMessage,
    message: "Message deleted successfully",
  });
});

/**
 * Delete entire conversation (all messages between two users)
 */
export const deleteConversation = asyncHandler(async (req, res) => {
  const { otherUserId } = req.params;

  const result = await MessageService.deleteConversation(
    req.user._id,
    otherUserId
  );

  res.status(200).json({
    success: true,
    data: result,
    message: "Conversation deleted successfully",
  });
});

/**
 * Search users
 */
export const searchUsers = asyncHandler(async (req, res) => {
  const { query } = req.query;

  const users = await UserService.searchUsers(query, req.user._id);

  res.status(200).json({
    success: true,
    data: users,
    message: "Users found",
  });
});
