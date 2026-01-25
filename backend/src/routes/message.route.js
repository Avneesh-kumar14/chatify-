import express from "express";
import {
  getAllContacts,
  getChatPartners,
  getMessagesByUserId,
  sendMessage,
  getUnreadCount,
  markMessageAsRead,
  markConversationAsRead,
  deleteMessage,
  editMessage,
  deleteConversation,
  searchUsers,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// SPECIAL ROUTES (must be before generic /:id routes)
router.get("/contacts", getAllContacts);
router.get("/search", searchUsers);
router.get("/chats", getChatPartners);
router.get("/unread", getUnreadCount);

// MESSAGE OPERATIONS - SPECIFIC ROUTES (before generic /:id)
router.post("/send/:id", sendMessage);
router.put("/:messageId/read", markMessageAsRead);
router.put("/:messageId/edit", editMessage);
router.delete("/:messageId", deleteMessage);
router.delete("/conversation/:otherUserId", deleteConversation);

// GENERIC ROUTES (must be last)
router.get("/:id", getMessagesByUserId);
router.put("/:otherUserId/read", markConversationAsRead);

export default router;