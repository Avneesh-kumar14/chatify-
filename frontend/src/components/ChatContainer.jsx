import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageContextMenu from "./MessageContextMenu";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    setMessages,
  } = useChatStore();
  const { authUser, onlineUsers } = useAuthStore();
  const theme = useThemeStore((state) => state.theme);
  const getThemeConfig = useThemeStore((state) => state.getThemeConfig);
  const themeConfig = getThemeConfig();
  const messageEndRef = useRef(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);

  // Color maps for received messages based on current theme
  const receivedMessageBgMap = {
    cyan: "bg-cyan-900/30 border-cyan-700/40",
    blue: "bg-blue-900/30 border-blue-700/40",
    purple: "bg-purple-900/30 border-purple-700/40",
    emerald: "bg-emerald-900/30 border-emerald-700/40",
    rose: "bg-rose-900/30 border-rose-700/40",
    violet: "bg-violet-900/30 border-violet-700/40",
    amber: "bg-amber-900/30 border-amber-700/40",
  };
  const receivedMessageBgClass = receivedMessageBgMap[themeConfig.border] || "bg-cyan-900/30 border-cyan-700/40";

  useEffect(() => {
    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();

    // clean up
    return () => unsubscribeFromMessages();
  }, [selectedUser, getMessagesByUserId, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleEditMessage = (editedMessage) => {
    setMessages(
      messages.map((msg) =>
        msg._id === editedMessage._id ? editedMessage : msg
      )
    );
  };

  const handleDeleteMessage = (messageId) => {
    // For soft delete, update the message to show it's deleted
    setMessages(
      messages.map((msg) =>
        msg._id === messageId 
          ? { ...msg, deletedAt: new Date().toISOString() }
          : msg
      )
    );
  };

  return (
    <>
      <ChatHeader />
      <div className="flex-1 px-6 overflow-y-auto py-8">
        {Array.isArray(messages) && messages.length > 0 && !isMessagesLoading ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {[...messages].reverse().map((msg) => {
              // Use senderIdValue (the original ID) for comparison
              // senderId might be a populated object {_id, fullName, profilePic}
              const senderIdValue = msg.senderIdValue || (typeof msg.senderId === 'string' ? msg.senderId : msg.senderId?._id);
              const authIdValue = authUser?._id;
              const isSentByMe = senderIdValue && authIdValue && senderIdValue.toString() === authIdValue.toString();
              
              // Get sender info
              const senderInfo = typeof msg.senderId === 'object' ? msg.senderId : { _id: senderIdValue };
              const isReceiverOnline = onlineUsers.includes(senderIdValue);

              return (
              <div
                key={msg._id}
                className={`chat ${isSentByMe ? "chat-end" : "chat-start"} group`}
                onMouseEnter={() => setHoveredMessageId(msg._id)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                {!isSentByMe && (
                  <div className={`chat-image avatar relative flex-shrink-0`}>
                    <div className={`w-10 h-10 rounded-full ring-2 ring-${themeConfig.border}/50
                      overflow-hidden shadow-md shadow-${themeConfig.border}/20
                      transition-all duration-300 hover:ring-${themeConfig.border}/80 hover:shadow-${themeConfig.border}/40`}>
                      <img 
                        src={senderInfo.profilePic || selectedUser?.profilePic || "/avatar.png"} 
                        alt={senderInfo.fullName || "Sender"}
                      />
                    </div>
                    {isReceiverOnline && (
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full 
                        bg-gradient-to-br ${themeConfig.bgGradient} border border-slate-900`}></div>
                    )}
                  </div>
                )}
                
                <div className="flex items-start gap-2">
                  <div
                    className={`chat-bubble relative transition-all duration-300 ${
                      msg.deletedAt
                        ? "bg-slate-700/50 text-slate-400 italic border border-slate-700/50"
                        : isSentByMe
                        ? `bg-gradient-to-br ${themeConfig.bgGradient} text-white shadow-lg shadow-${themeConfig.border}/30`
                        : `${receivedMessageBgClass} text-slate-100 shadow-md shadow-slate-900/30`
                    }`}
                  >
                    {msg.deletedAt ? (
                      <p className="text-sm">This message was deleted</p>
                    ) : (
                      <>
                        {msg.image && (
                          <img 
                            src={msg.image} 
                            alt="Shared" 
                            className="rounded-lg h-48 object-cover shadow-lg ring-2 ring-slate-700/50" 
                          />
                        )}
                        {msg.text && <p className={`${msg.image ? 'mt-2' : ''} text-sm sm:text-base`}>{msg.text}</p>}
                        {msg.editedAt && (
                          <p className="text-xs mt-1 opacity-60 italic">(edited)</p>
                        )}
                        <p className={`text-xs mt-2 flex items-center gap-1 ${
                          isSentByMe 
                            ? 'opacity-70 text-white' 
                            : 'opacity-60 text-slate-400'
                        }`}>
                          {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </>
                    )}
                  </div>

                  {hoveredMessageId === msg._id && !msg.deletedAt && (
                    <MessageContextMenu
                      message={msg}
                      authUserId={authUser?._id}
                      onEdit={handleEditMessage}
                      onDelete={handleDeleteMessage}
                    />
                  )}
                </div>
                
                {isSentByMe && (
                  <div className={`chat-image avatar relative flex-shrink-0`}>
                    <div className={`w-10 h-10 rounded-full ring-2 ring-${themeConfig.border}/50
                      overflow-hidden shadow-md shadow-${themeConfig.border}/20
                      transition-all duration-300 hover:ring-${themeConfig.border}/80 hover:shadow-${themeConfig.border}/40`}>
                      <img 
                        src={authUser?.profilePic || "/avatar.png"} 
                        alt="You"
                      />
                    </div>
                  </div>
                )}
              </div>
              );
            })}
            {/* 👇 scroll target */}
            <div ref={messageEndRef} />
          </div>
        ) : isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        )}
      </div>

      <MessageInput />
    </>
  );
}

export default ChatContainer;
