import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import ConfirmationModal from "./ConfirmationModal";

function ChatsList() {
  const { getMyChatPartners, chats, isUsersLoading, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [selectedChatToDelete, setSelectedChatToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    getMyChatPartners();
  }, []);

  const handleDeleteConversation = (chat, e) => {
    e.stopPropagation();
    setSelectedChatToDelete(chat);
    setDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedChatToDelete) return;

    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/messages/conversation/${selectedChatToDelete._id}`);
      toast.success(`Chat with ${selectedChatToDelete.fullName} deleted! 🗑️`, {
        duration: 3000,
        style: {
          background: "#10b981",
          color: "#fff",
          borderRadius: "0.5rem",
          padding: "16px",
          fontWeight: "500",
        },
      });
      getMyChatPartners();
      setDeleteConfirm(false);
      setSelectedChatToDelete(null);
    } catch (error) {
      toast.error("Failed to delete conversation", {
        duration: 3000,
        style: {
          background: "#ef4444",
          color: "#fff",
          borderRadius: "0.5rem",
          padding: "16px",
        },
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isUsersLoading) return <UsersLoadingSkeleton />;
  if (!Array.isArray(chats) || chats.length === 0) return <NoChatsFound />;

  return (
    <>
      {chats.map((chat) => (
        <div
          key={chat._id}
          className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-4 rounded-xl cursor-pointer hover:from-cyan-500/20 hover:to-blue-500/20 transition-all duration-300 group flex items-center justify-between hover:shadow-lg hover:shadow-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/40"
        >
          <div
            className="flex items-center gap-3 flex-1"
            onClick={() => setSelectedUser(chat)}
          >
            <div className={`avatar ${onlineUsers.includes(chat._id) ? "online" : "offline"}`}>
              <div className="size-12 rounded-full ring-2 ring-cyan-500/40 hover:ring-cyan-400 transition-all group-hover:ring-cyan-400 shadow-lg shadow-cyan-500/20">
                <img src={chat.profilePic || "/avatar.png"} alt={chat.fullName} className="group-hover:scale-105 transition-transform duration-200" />
              </div>
            </div>
            <h4 className="text-slate-100 font-semibold truncate group-hover:text-cyan-300 transition-colors duration-200">{chat.fullName}</h4>
          </div>
          <button
            onClick={(e) => handleDeleteConversation(chat, e)}
            className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-all duration-200 text-error hover:bg-error/10"
            title="Delete conversation"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirm}
        title="Delete Conversation"
        message={`Are you sure you want to delete the conversation with ${selectedChatToDelete?.fullName}? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteConfirm(false);
          setSelectedChatToDelete(null);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
export default ChatsList;
