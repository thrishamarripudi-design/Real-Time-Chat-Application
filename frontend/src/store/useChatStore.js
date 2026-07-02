import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "./useAuthStore.js";
import { showNotification } from "../lib/notifications.js";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  typingUserId: null,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  // Subscribes ONCE per login (called from App.jsx), not per-conversation,
  // so messages/notifications arrive even for chats you don't have open.
  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages, users } = get();
      const isFromOpenConversation = selectedUser && newMessage.senderId === selectedUser._id;

      if (isFromOpenConversation) {
        set({ messages: [...messages, newMessage] });
      }

      const sender = users.find((u) => u._id === newMessage.senderId);
      showNotification(sender ? `${sender.fullName}` : "New message", {
        body: newMessage.image ? "📷 Sent an image" : newMessage.text,
        suppressIfVisible: isFromOpenConversation,
        onClick: () => {
          if (sender) get().setSelectedUser(sender);
        },
      });

      if (!isFromOpenConversation) {
        toast(`New message from ${sender?.fullName || "someone"}`, { icon: "💬" });
      }
    });

    socket.off("typing:start");
    socket.on("typing:start", ({ from }) => {
      if (get().selectedUser?._id === from) set({ typingUserId: from });
    });

    socket.off("typing:stop");
    socket.on("typing:stop", ({ from }) => {
      if (get().selectedUser?._id === from) set({ typingUserId: null });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("typing:start");
    socket.off("typing:stop");
  },

  emitTypingStart: (toUserId) => {
    const socket = useAuthStore.getState().socket;
    socket?.emit("typing:start", { to: toUserId });
  },

  emitTypingStop: (toUserId) => {
    const socket = useAuthStore.getState().socket;
    socket?.emit("typing:stop", { to: toUserId });
  },

  setSelectedUser: (selectedUser) => set({ selectedUser, typingUserId: null }),
}));