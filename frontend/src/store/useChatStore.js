import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),
  setMessages: (messages) => set({ messages }),

  getAllContacts: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/contacts");
      set({ allContacts: res.data.data || [] });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },
  getMyChatPartners: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chats");
      set({ chats: res.data.data || [] });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessagesByUserId: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data.data || [] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const { authUser } = useAuthStore.getState();

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text || null,
      image: messageData.image || null,
      createdAt: new Date().toISOString(),
      status: "pending", // Track message status: pending → sent → delivered → read
    };

    // IMMEDIATELY add optimistic message to UI
    // Backend returns newest-first, so prepend new messages
    set({ messages: [optimisticMessage, ...messages] });

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);

      // FIXED: Replace temp message with real one, don't concat
      // This prevents duplicates when socket event also arrives
      set({
        messages: get().messages.map((msg) =>
          msg._id === tempId 
            ? { ...res.data.data, status: "sent" } 
            : msg
        ),
      });
    } catch (error) {
      // FIXED: Only remove failed message, not all messages
      // Previous version caused loss of concurrent messages
      set({
        messages: get().messages.filter((msg) => msg._id !== tempId),
      });
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const { selectedUser: currentSelectedUser } = get();
      
      // Check if message is for the currently selected conversation
      const isForSelectedConversation = 
        (newMessage.senderId.toString() === currentSelectedUser._id.toString()) ||
        (newMessage.receiverId.toString() === currentSelectedUser._id.toString());
      
      if (!isForSelectedConversation) return;

      const currentMessages = get().messages;
      
      // FIXED: Deduplication check
      // Message might arrive via:
      // 1. HTTP response (already added)
      // 2. Socket event (would create duplicate)
      // This prevents duplicates
      const messageAlreadyExists = currentMessages.some(
        (msg) => msg._id?.toString() === newMessage._id?.toString()
      );

      if (messageAlreadyExists) {
        // Update status if message already exists
        // (e.g., from pending → delivered)
        set({
          messages: currentMessages.map((msg) =>
            msg._id?.toString() === newMessage._id?.toString()
              ? { ...msg, ...newMessage }
              : msg
          ),
        });
        return;
      }

      // NEW message from socket (shouldn't happen often with HTTP response)
      // Backend returns newest-first (sort: -1), so prepend new messages
      set({ messages: [newMessage, ...currentMessages] });

      if (isSoundEnabled) {
        const notificationSound = new Audio("/sounds/notification.mp3");
        notificationSound.currentTime = 0;
        notificationSound.play().catch((e) => console.log("Audio play failed:", e));
      }
    });

    // Listen for edited messages
    socket.on("messageEdited", (editedData) => {
      const currentMessages = get().messages;
      set({
        messages: currentMessages.map((msg) =>
          msg._id?.toString() === editedData.messageId?.toString()
            ? { ...msg, text: editedData.text, editedAt: editedData.editedAt }
            : msg
        ),
      });
    });

    // Listen for deleted messages
    socket.on("messageDeleted", (deletedData) => {
      const currentMessages = get().messages;
      set({
        messages: currentMessages.map((msg) =>
          msg._id?.toString() === deletedData.messageId?.toString()
            ? { ...msg, deletedAt: new Date().toISOString() }
            : msg
        ),
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageEdited");
    socket.off("messageDeleted");
  },
}));
