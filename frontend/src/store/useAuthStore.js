import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { requestNotificationPermission } from "../lib/notifications.js";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

const TOKEN_KEY = "chat-token";
const USER_KEY = "chat-user";

// sessionStorage is isolated per browser TAB (unlike localStorage or
// cookies, which are shared across every tab on the same origin). That's
// what lets you open 3 tabs and be 3 different logged-in users at once.
const persistSession = (user, token) => {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
};

const clearSession = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
};

const loadStoredUser = () => {
  const raw = sessionStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const useAuthStore = create((set, get) => ({
  authUser: loadStoredUser(),
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  // Incoming/outgoing call state lives here so it's reachable from
  // anywhere in the app (a global incoming-call modal, notifications, etc).
  incomingCall: null, // { from, offer, callType, callerInfo }
  activeCall: null, // { peerId, peerInfo, callType, status: "calling"|"connected" }

  checkAuth: async () => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ authUser: null, isCheckingAuth: false });
      return;
    }
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      persistSession(res.data, token);
      get().connectSocket();
      requestNotificationPermission();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      clearSession();
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      const { token, ...user } = res.data;
      persistSession(user, token);
      set({ authUser: user });
      toast.success("Account created successfully");
      get().connectSocket();
      requestNotificationPermission();
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      const { token, ...user } = res.data;
      persistSession(user, token);
      set({ authUser: user });
      toast.success("Logged in successfully");
      get().connectSocket();
      requestNotificationPermission();
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      clearSession();
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      const token = sessionStorage.getItem(TOKEN_KEY);
      persistSession(res.data, token);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    // forceNew ensures each tab's socket.io-client instance opens its own
    // independent websocket connection (each carrying that tab's userId),
    // rather than any transport-level sharing.
    const socket = io(BASE_URL, {
      query: { userId: authUser._id },
      forceNew: true,
    });
    socket.connect();

    set({ socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    // ---- WebRTC signaling events (global, since a call can arrive
    // regardless of which page/chat the user currently has open) ----
    socket.on("call:incoming", ({ from, offer, callType, callerInfo }) => {
      set({ incomingCall: { from, offer, callType, callerInfo } });
    });

    socket.on("call:unavailable", () => {
      toast.error("User is not online");
      set({ activeCall: null });
    });

    socket.on("call:rejected", () => {
      toast("Call declined", { icon: "📵" });
      set({ activeCall: null });
    });

    socket.on("call:ended", () => {
      set({ activeCall: null });
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
    set({ socket: null, onlineUsers: [], incomingCall: null, activeCall: null });
  },

  setIncomingCall: (call) => set({ incomingCall: call }),
  setActiveCall: (call) => set({ activeCall: call }),
}));