import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
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
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);

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

              return (
              <div
                key={msg._id}
                className={`chat ${isSentByMe ? "chat-end" : "chat-start"} group`}
                onMouseEnter={() => setHoveredMessageId(msg._id)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`chat-bubble relative ${
                      msg.deletedAt
                        ? "bg-slate-700 text-slate-400 italic"
                        : isSentByMe
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-800 text-slate-200"
                    }`}
                  >
                    {msg.deletedAt ? (
                      <p>This message was deleted</p>
                    ) : (
                      <>
                        {msg.image && (
                          <img src={msg.image} alt="Shared" className="rounded-lg h-48 object-cover" />
                        )}
                        {msg.text && <p className="mt-2">{msg.text}</p>}
                        {msg.editedAt && (
                          <p className="text-xs mt-1 opacity-60">(edited)</p>
                        )}
                        <p className="text-xs mt-1 opacity-75 flex items-center gap-1">
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
