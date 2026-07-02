import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore.js";
import toast from "react-hot-toast";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// Encapsulates the full WebRTC lifecycle: creating the peer connection,
// getting local media, exchanging SDP offer/answer + ICE candidates over
// the existing socket.io connection, and tearing everything down cleanly.
export function useWebRTC() {
  const { socket, activeCall, setActiveCall, incomingCall, setIncomingCall, authUser } = useAuthStore();

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const pcRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setLocalStream((stream) => {
      stream?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setRemoteStream(null);
    pendingCandidatesRef.current = [];
    setIsMuted(false);
    setIsCameraOff(false);
  }, []);

  const createPeerConnection = useCallback(
    (peerId) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call:ice-candidate", { to: peerId, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      pc.onconnectionstatechange = () => {
        if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
          setActiveCall((prev) => (prev ? { ...prev, status: "ended" } : null));
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [socket, setActiveCall]
  );

  const getLocalMedia = useCallback(async (callType) => {
    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
    const constraints =
      callType === "video"
        ? { video: true, audio: audioConstraints }
        : { video: false, audio: audioConstraints };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    setLocalStream(stream);
    return stream;
  }, []);

  // ---- Outgoing call ----
  const startCall = useCallback(
    async (peer, callType) => {
      try {
        setActiveCall({ peerId: peer._id, peerInfo: peer, callType, status: "calling" });

        const stream = await getLocalMedia(callType);
        const pc = createPeerConnection(peer._id);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("call:offer", {
          to: peer._id,
          offer,
          callType,
          callerInfo: { _id: authUser._id, fullName: authUser.fullName, profilePic: authUser.profilePic },
        });
      } catch (err) {
        console.error("startCall error:", err);
        toast.error(
          err.name === "NotAllowedError"
            ? "Camera/microphone permission denied"
            : "Could not start call"
        );
        cleanup();
        setActiveCall(null);
      }
    },
    [authUser, socket, getLocalMedia, createPeerConnection, setActiveCall, cleanup]
  );

  // ---- Accept incoming call ----
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const { from, offer, callType, callerInfo } = incomingCall;

    try {
      setActiveCall({ peerId: from, peerInfo: callerInfo, callType, status: "connected" });
      setIncomingCall(null);

      const stream = await getLocalMedia(callType);
      const pc = createPeerConnection(from);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Apply any ICE candidates that arrived before remoteDescription was set.
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("call:answer", { to: from, answer });
    } catch (err) {
      console.error("acceptCall error:", err);
      toast.error(
        err.name === "NotAllowedError"
          ? "Camera/microphone permission denied"
          : "Could not join call"
      );
      cleanup();
      setActiveCall(null);
    }
  }, [incomingCall, socket, getLocalMedia, createPeerConnection, setActiveCall, setIncomingCall, cleanup]);

  const declineCall = useCallback(() => {
    if (!incomingCall) return;
    socket.emit("call:reject", { to: incomingCall.from });
    setIncomingCall(null);
  }, [incomingCall, socket, setIncomingCall]);

  const endCall = useCallback(() => {
    if (activeCall) {
      socket.emit("call:end", { to: activeCall.peerId });
    }
    cleanup();
    setActiveCall(null);
  }, [activeCall, socket, cleanup, setActiveCall]);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    });
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsCameraOff(!track.enabled);
    });
  }, [localStream]);

  // ---- Socket listeners for the signaling that happens mid-call ----
  useEffect(() => {
    if (!socket) return;

    const handleAnswer = async ({ answer }) => {
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : prev));

      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];
    };

    const handleIceCandidate = async ({ candidate }) => {
      const pc = pcRef.current;
      if (!pc) return;
      if (pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    };

    const handleEnded = () => {
      cleanup();
      setActiveCall(null);
    };

    socket.on("call:answer", handleAnswer);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:ended", handleEnded);
    socket.on("call:rejected", handleEnded);

    return () => {
      socket.off("call:answer", handleAnswer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:ended", handleEnded);
      socket.off("call:rejected", handleEnded);
    };
  }, [socket, cleanup, setActiveCall]);

  return {
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}