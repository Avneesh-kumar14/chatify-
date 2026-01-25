import { useState } from "react";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { useChatStore } from "../store/useChatStore";

function MessageContextMenu({ message, authUserId, onEdit, onDelete, position }) {
  const { selectedUser } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user can edit (only sender and within 24 hours)
  const canEdit =
    message.senderId?.toString?.() === authUserId?.toString?.() ||
    message.senderId?._id?.toString?.() === authUserId?.toString?.();

  // Check if message is older than 24 hours
  const createdTime = new Date(message.createdAt).getTime();
  const nowTime = Date.now();
  const ageHours = (nowTime - createdTime) / (1000 * 60 * 60);
  const canEditByTime = ageHours <= 24;

  // Check if message is deleted
  const isDeleted = message.deletedAt;

  const handleEditMessage = async () => {
    if (!editText.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.put(`/messages/${message._id}/edit`, {
        text: editText,
      });

      if (response.data.success) {
        toast.success("Message edited");
        onEdit(response.data.data);
        setIsEditing(false);
        setIsOpen(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to edit message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async () => {
    if (window.confirm("Delete this message?")) {
      setIsLoading(true);
      try {
        const response = await axiosInstance.delete(`/messages/${message._id}`);

        if (response.data.success) {
          toast.success("Message deleted");
          onDelete(message._id);
          setIsOpen(false);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to delete message");
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isDeleted) {
    return null;
  }

  return (
    <div className="dropdown dropdown-end" style={position}>
      <button
        tabIndex={0}
        className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-100"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-slate-800 rounded-box w-52 border border-slate-700">
        {/* Copy */}
        <li>
          <a
            onClick={() => {
              navigator.clipboard.writeText(message.text);
              toast.success("Copied to clipboard");
              setIsOpen(false);
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Copy
          </a>
        </li>

        {/* Edit (only for sender) */}
        {canEdit && canEditByTime && (
          <li>
            <a
              onClick={() => {
                setIsEditing(true);
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </a>
          </li>
        )}

        {/* Delete (only for sender) */}
        {canEdit && (
          <li>
            <a onClick={handleDeleteMessage} className="text-error">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </a>
          </li>
        )}
      </ul>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal modal-open">
            <div className="modal-box bg-slate-800">
              <h3 className="font-bold text-lg mb-4 text-white">Edit Message</h3>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="textarea textarea-bordered w-full bg-slate-700 text-white placeholder-slate-400"
                rows="4"
              />
              <p className="text-xs text-slate-400 mt-2">
                Messages can only be edited within 24 hours
              </p>
              <div className="modal-action">
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditMessage}
                  disabled={isLoading}
                  className="btn btn-primary btn-sm"
                >
                  {isLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
            <form method="dialog" className="modal-backdrop">
              <button onClick={() => setIsEditing(false)}>close</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MessageContextMenu;
