import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

/**
 * ============================================
 * INDEXING STRATEGY
 * ============================================
 * 
 * Index choices impact query performance significantly:
 * - Without indexes: O(n) full collection scan
 * - With indexes: O(log n) B-tree search
 * 
 * Trade-offs:
 * - Faster queries (lower latency)
 * - Slower writes (index updates)
 * - More storage (index data structures)
 * 
 * For chat apps, read-heavy dominates, so indexes pay off.
 */

// Email is already indexed via unique: true in schema definition above
// userSchema.index({ email: 1 }, { unique: true }); // REMOVED - duplicate

// Presence queries: "Get all online users"
userSchema.index({ status: 1 });

// "Show last active" in contact list
userSchema.index({ lastSeen: -1 });

// Recent signups
userSchema.index({ updatedAt: -1 });

const User = mongoose.model("User", userSchema);

export default User;

