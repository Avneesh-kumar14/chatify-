import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    image: {
      type: String,
    },
    file: {
      url: String,
      name: String,
      size: Number,
      mimeType: String,
    },
    /**
     * Message delivery status tracking:
     * - pending: Saved to DB, waiting for response to client
     * - sent: Response sent to sender's client
     * - delivered: Receiver's client received notification
     * - read: Receiver opened message (blue checkmark)
     * 
     * State flow: pending → sent → delivered → read
     */
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "read"],
      default: "pending",
    },
    deliveredAt: Date,
    readAt: Date,
    editedAt: Date,
    /**
     * Soft delete: Don't physically delete, mark as deleted
     * Reason: Foreign key constraints, audit trails, recovery
     * When soft-deleted, exclude from queries by default
     */
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

/**
 * ============================================
 * INDEXING STRATEGY
 * ============================================
 * 
 * Most common queries:
 * 1. "Get messages between two users" - compound index needed
 * 2. "Get unread messages for user" - status + receiverId
 * 3. "Get recent conversations" - sorting by date
 * 4. "Soft delete filtering" - exclude deleted messages
 * 
 * Compound Index Explanation:
 * Query: db.messages.find({
 *   $or: [
 *     { senderId: A, receiverId: B },
 *     { senderId: B, receiverId: A }
 *   ]
 * }).sort({ createdAt: -1 })
 * 
 * Index: (senderId, receiverId, createdAt)
 * - MongoDB can find matching documents directly
 * - Then traverse sorted order in-index
 * - WITHOUT: must scan all messages + sort = O(n log n)
 * - WITH: direct B-tree traversal = O(log n + k)
 * - Speedup: 100x for 1M documents
 */

// Query: Get messages between two specific users, sorted by date
// Example: Chat history screen loads messages most recent first
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

// Alternative: Helps if query is reversed (B sent to A)
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });

// Query: Get unread messages for user
// Example: Notification badge shows "3 unread"
messageSchema.index({ receiverId: 1, status: 1 });

// Query: Soft delete filtering
// Example: Exclude deleted messages from display
messageSchema.index({ deletedAt: 1 });

// Query: Get conversation list (sorted by newest message)
// Example: "Conversations" sidebar shows recent chats first
// This is less critical if we cache in Redis
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;

