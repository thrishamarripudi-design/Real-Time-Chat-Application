import { Phone, PhoneOff, Video } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";

const IncomingCallModal = ({ onAccept, onDecline }) => {
  const { incomingCall } = useAuthStore();

  if (!incomingCall) return null;

  const { callerInfo, callType } = incomingCall;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-base-100 rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="avatar mb-4">
          <div className="w-24 h-24 rounded-full mx-auto ring ring-primary ring-offset-2 animate-pulse">
            <img src={callerInfo?.profilePic || "/avatar.png"} alt={callerInfo?.fullName} />
          </div>
        </div>

        <h3 className="text-xl font-bold">{callerInfo?.fullName || "Someone"}</h3>
        <p className="text-base-content/60 mt-1 flex items-center justify-center gap-2">
          {callType === "video" ? <Video className="size-4" /> : <Phone className="size-4" />}
          Incoming {callType === "video" ? "video" : "voice"} call...
        </p>

        <div className="flex justify-center gap-6 mt-8">
          <button
            onClick={onDecline}
            className="btn btn-circle btn-lg bg-red-500 hover:bg-red-600 border-none text-white"
          >
            <PhoneOff className="size-6" />
          </button>
          <button
            onClick={onAccept}
            className="btn btn-circle btn-lg bg-green-500 hover:bg-green-600 border-none text-white animate-bounce"
          >
            <Phone className="size-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;