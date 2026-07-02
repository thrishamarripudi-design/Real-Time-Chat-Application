import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff, Volume2 } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";

// Browsers frequently block autoplay of audio/video that's attached to a
// srcObject asynchronously (which is exactly what happens here, since the
// stream only arrives after the WebRTC offer/answer/ICE exchange
// completes -- well after the click that started/accepted the call). When
// that happens, .play() rejects with NotAllowedError and the element sits
// there silently with no sound and no visible error. We call .play()
// explicitly and surface a "tap to enable audio" banner if it's rejected,
// so the person actually knows why they can't hear anything.
const attachAndPlay = async (el, stream, setBlocked) => {
  if (!el || !stream) return;
  if (el.srcObject !== stream) el.srcObject = stream;
  try {
    await el.play();
    setBlocked(false);
  } catch (err) {
    if (err.name === "NotAllowedError") setBlocked(true);
  }
};

const CallScreen = ({ webrtc }) => {
  const { activeCall } = useAuthStore();
  const { localStream, remoteStream, isMuted, isCameraOff, endCall, toggleMute, toggleCamera } = webrtc;

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [audioBlocked, setAudioBlocked] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (activeCall?.callType === "video") {
      attachAndPlay(remoteVideoRef.current, remoteStream, setAudioBlocked);
    }
    if (activeCall?.callType === "audio") {
      attachAndPlay(remoteAudioRef.current, remoteStream, setAudioBlocked);
    }
  }, [remoteStream, activeCall?.callType]);

  const handleEnableAudio = () => {
    const el = activeCall?.callType === "video" ? remoteVideoRef.current : remoteAudioRef.current;
    attachAndPlay(el, remoteStream, setAudioBlocked);
  };

  if (!activeCall) return null;

  const { peerInfo, callType, status } = activeCall;
  const isVideo = callType === "video";

  return (
    <div className="fixed inset-0 z-50 bg-neutral text-neutral-content flex flex-col">
      {audioBlocked && (
        <button
          onClick={handleEnableAudio}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-10 btn btn-warning btn-sm gap-2 shadow-lg animate-pulse"
        >
          <Volume2 className="size-4" />
          Tap to enable audio
        </button>
      )}
      <div className="flex-1 relative overflow-hidden">
        {isVideo ? (
          <>
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover bg-black"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-base-300">
                <div className="avatar">
                  <div className="w-28 h-28 rounded-full ring ring-primary ring-offset-2 animate-pulse">
                    <img src={peerInfo?.profilePic || "/avatar.png"} alt={peerInfo?.fullName} />
                  </div>
                </div>
                <p className="text-lg font-medium">
                  {status === "calling" ? `Calling ${peerInfo?.fullName}...` : "Connecting..."}
                </p>
              </div>
            )}

            {localStream && (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-6 right-6 w-32 sm:w-48 aspect-video object-cover rounded-xl border-2 border-base-100 shadow-lg bg-black"
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <div className="avatar">
              <div className="w-32 h-32 rounded-full ring ring-primary ring-offset-2 animate-pulse">
                <img src={peerInfo?.profilePic || "/avatar.png"} alt={peerInfo?.fullName} />
              </div>
            </div>
            <h2 className="text-2xl font-bold">{peerInfo?.fullName}</h2>
            <p className="text-base-content/60">
              {status === "calling" ? "Calling..." : remoteStream ? "Connected" : "Connecting..."}
            </p>
            <audio ref={remoteAudioRef} autoPlay />
          </div>
        )}
      </div>

      <div className="p-6 flex items-center justify-center gap-4 bg-base-100/10">
        <button
          onClick={toggleMute}
          className={`btn btn-circle btn-lg ${isMuted ? "bg-red-500 hover:bg-red-600 border-none text-white" : "btn-neutral"}`}
        >
          {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </button>

        {isVideo && (
          <button
            onClick={toggleCamera}
            className={`btn btn-circle btn-lg ${isCameraOff ? "bg-red-500 hover:bg-red-600 border-none text-white" : "btn-neutral"}`}
          >
            {isCameraOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
          </button>
        )}

        <button
          onClick={endCall}
          className="btn btn-circle btn-lg bg-red-500 hover:bg-red-600 border-none text-white"
        >
          <PhoneOff className="size-6" />
        </button>
      </div>
    </div>
  );
};

export default CallScreen;