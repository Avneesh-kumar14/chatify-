import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useThemeStore } from "../store/useThemeStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import ConfirmationModal from "./ConfirmationModal";

function ChatsList() {
  const { getMyChatPartners, chats, isUsersLoading, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const theme = useThemeStore((state) => state.theme);
  const getThemeConfig = useThemeStore((state) => state.getThemeConfig);
  const themeConfig = getThemeConfig();
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
      {chats.map((chat) => {
        const isOnline = onlineUsers.includes(chat._id);
        return (
        <div
          key={chat._id}
          className={`bg-gradient-to-r ${themeConfig.bgGradient}/5 p-4 rounded-xl cursor-pointer 
            hover:${themeConfig.bgGradient}/20 transition-all duration-300 group flex items-center justify-between
            hover:shadow-lg hover:shadow-${themeConfig.border}/40 border border-${themeConfig.border}/20 hover:border-${themeConfig.border}/50`}
        >
          <div
            className="flex items-center gap-4 flex-1"
            onClick={() => setSelectedUser(chat)}
          >
            <div className={`avatar ${isOnline ? "online" : "offline"} relative flex-shrink-0 group/avatar`}>
              <div className={`size-14 rounded-full ring-2 ring-${themeConfig.border} ring-offset-2 ring-offset-slate-900
                overflow-hidden transition-all duration-300 group-hover:scale-110 group-hover:ring-offset-4
                shadow-lg shadow-${themeConfig.border}/30 group-hover:shadow-${themeConfig.border}/50
                relative before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-tr before:opacity-0
                group-hover:before:opacity-10 before:transition-opacity before:duration-300`}>
                <img 
                  src={chat.profilePic || "/avatar.png"} 
                  alt={chat.fullName}
                  className="size-full object-cover group-hover/avatar:scale-110 transition-transform duration-300"
                />
              </div>
              {isOnline && (
                <div className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-slate-900 
                  bg-gradient-to-br ${themeConfig.bgGradient}/80 animate-pulse`}></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`text-slate-100 font-semibold truncate group-hover:text-${themeConfig.border} 
                transition-colors duration-300`}>
                {chat.fullName}
              </h4>
              <p className={`text-xs transition-colors duration-300 ${
                isOnline 
                  ? `text-${themeConfig.border}/80 font-medium` 
                  : "text-slate-500"
              }`}>
                {isOnline ? "● Active now" : "● Offline"}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => handleDeleteConversation(chat, e)}
            className={`btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-all duration-200 
              text-error hover:bg-error/10 hover:text-red-400`}
            title="Delete conversation"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        );
      })}

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
