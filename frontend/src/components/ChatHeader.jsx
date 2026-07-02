import { Phone, Video, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";
import { useChatStore } from "../store/useChatStore.js";

const ChatHeader = ({ onStartCall }) => {
  const { selectedUser, setSelectedUser, typingUserId } = useChatStore();
  const { onlineUsers, activeCall } = useAuthStore();

  const isOnline = onlineUsers.includes(selectedUser._id);
  const isTyping = typingUserId === selectedUser._id;

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
            </div>
          </div>

          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {isTyping ? "typing..." : isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="btn btn-ghost btn-circle btn-sm"
            disabled={!isOnline || !!activeCall}
            onClick={() => onStartCall("audio")}
            title={isOnline ? "Voice call" : "User is offline"}
          >
            <Phone className="size-5" />
          </button>
          <button
            className="btn btn-ghost btn-circle btn-sm"
            disabled={!isOnline || !!activeCall}
            onClick={() => onStartCall("video")}
            title={isOnline ? "Video call" : "User is offline"}
          >
            <Video className="size-5" />
          </button>
          <button onClick={() => setSelectedUser(null)} className="btn btn-ghost btn-circle btn-sm">
            <X className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;