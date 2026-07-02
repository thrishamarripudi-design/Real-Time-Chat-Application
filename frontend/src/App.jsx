import { Navigate, Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";

import HomePage from "./pages/HomePage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";

import { useAuthStore } from "./store/useAuthStore.js";
import { useChatStore } from "./store/useChatStore.js";
import { useThemeStore } from "./store/useThemeStore.js";
import { useEffect } from "react";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

import { useWebRTC } from "./hooks/useWebRTC.js";
import IncomingCallModal from "./components/IncomingCallModal.jsx";
import CallScreen from "./components/CallScreen.jsx";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, socket, activeCall } = useAuthStore();
  const { subscribeToMessages, unsubscribeFromMessages } = useChatStore();
  const { theme } = useThemeStore();

  const webrtc = useWebRTC();

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to chat + notification socket events ONCE per login (per
  // socket connection), not per selected conversation -- this is what
  // lets a message/notification arrive even for a chat you don't have
  // open, and is separate from the per-conversation history fetch in
  // ChatContainer.
  useEffect(() => {
    if (!socket) return;
    subscribeToMessages();
    return () => unsubscribeFromMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );
  }

  return (
    <div data-theme={theme}>
      <Navbar />

      <Routes>
        <Route path="/" element={authUser ? <HomePage webrtc={webrtc} /> : <Navigate to="/login" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
      </Routes>

      {authUser && <IncomingCallModal onAccept={webrtc.acceptCall} onDecline={webrtc.declineCall} />}
      {authUser && activeCall && <CallScreen webrtc={webrtc} />}

      <Toaster />
    </div>
  );
};

export default App;