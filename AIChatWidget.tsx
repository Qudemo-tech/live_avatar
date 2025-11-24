import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  MessageCircle,
  Send,
  PhoneOff,
  RefreshCw,
  Calendar,
  Mic,
  MicOff,
  Speaker,
  Radio,
  MessageSquare,
  Ear,
  Brain,
  Smile,
  Target,
  User,
  Bot,
  Video,
} from "lucide-react";
import {
  Room,
  RemoteParticipant,
  RemoteTrack,
  createLocalAudioTrack,
  LocalAudioTrack,
  RoomEvent,
  DataPacket_Kind,
  Track,
} from "livekit-client";

const TypingText = ({
  text,
  onComplete,
}: {
  text: string;
  onComplete: () => void;
}) => {
  const [displayText, setDisplayText] = useState("");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const words = text.split(" ");

  useEffect(() => {
    if (!hasStarted) {
      const initialTimer = setTimeout(() => setHasStarted(true), 500);
      return () => clearTimeout(initialTimer);
    }
  }, [hasStarted]);

  useEffect(() => {
    if (hasStarted && currentWordIndex < words.length) {
      const baseDelay = 200;
      const randomDelay = Math.random() * 200;
      const word = words[currentWordIndex];
      const hasPunctuation = /[.,!?;:]/.test(word);

      let delay = baseDelay + randomDelay;
      if (hasPunctuation) delay += Math.random() * 150;

      const timer = setTimeout(() => {
        setDisplayText((prev) => prev + (prev ? " " : "") + word);
        setCurrentWordIndex((prev) => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    } else if (hasStarted && currentWordIndex >= words.length) {
      onComplete();
    }
  }, [currentWordIndex, words, onComplete, hasStarted]);

  return <span>{displayText}</span>;
};

type WidgetState = "minimized" | "small" | "medium" | "maximized";

type Message = {
  role: string;
  content: string;
  isTyping: boolean;
  id?: number;
};

export const AIChatWidget = () => {
  const [state, setState] = useState<WidgetState>("minimized");
  const [showChat, setShowChat] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isVoiceMode, setIsVoiceMode] = useState(true);
  const [showInactivityPrompt, setShowInactivityPrompt] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showBookingPopup, setShowBookingPopup] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [email, setEmail] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey, I'm Catherine your Qudemo visual Agent. What brings you to us today?",
      isTyping: false,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [typingMessageId, setTypingMessageId] = useState<number | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionToScreenShare, setTransitionToScreenShare] = useState(false);
  const screenShareRef = useRef(false);

  // LiveAvatar states
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [hasLiveVideo, setHasLiveVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [avatarState, setAvatarState] = useState<string>("idle");
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [transcripts, setTranscripts] = useState<
    Array<{ type: string; text: string; timestamp: number }>
  >([]);
  const [detectedIntents, setDetectedIntents] = useState<string[]>([]);
  const localAudioRef = useRef<LocalAudioTrack | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (room) {
        room.disconnect();
      }
      if (localAudioRef.current) {
        localAudioRef.current.stop();
      }
    };
  }, [room]);

  useEffect(() => {
    let initialTimer: NodeJS.Timeout;
    let interval: NodeJS.Timeout;

    if (state !== "minimized" && !isVoiceMode) {
      initialTimer = setTimeout(() => {
        const toggleScreenShare = () => {
          setIsTransitioning(true);
          const nextState = !screenShareRef.current;
          setTransitionToScreenShare(nextState);

          setTimeout(() => {
            screenShareRef.current = nextState;
            setIsScreenSharing(nextState);
            setTimeout(() => setIsTransitioning(false), 300);
          }, 500);
        };

        toggleScreenShare();
        interval = setInterval(toggleScreenShare, 7000);
      }, 1000);
    } else if (isVoiceMode) {
      screenShareRef.current = false;
      setIsScreenSharing(false);
      setIsTransitioning(false);
    }

    return () => {
      if (initialTimer) clearTimeout(initialTimer);
      if (interval) clearInterval(interval);
    };
  }, [state, isVoiceMode]);

  const timeSlots = ["9:00 AM", "11:00 AM", "2:00 PM", "4:00 PM"];
  const availableDates = [
    new Date().toISOString().split("T")[0],
    new Date(Date.now() + 86400000).toISOString().split("T")[0],
    new Date(Date.now() + 172800000).toISOString().split("T")[0],
  ];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state === "minimized") return;
    const checkInactivity = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivity;
      if (timeSinceLastActivity > 30000 && !showInactivityPrompt) {
        setShowInactivityPrompt(true);
      }
    }, 5000);
    return () => clearInterval(checkInactivity);
  }, [lastActivity, showInactivityPrompt, state]);

  const handleActivity = () => {
    setLastActivity(Date.now());
    setShowInactivityPrompt(false);
  };

  const handleCreateNewConversation = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Hey, I'm Catherine your Qudemo visual Agent. What brings you to us today?",
        isTyping: false,
      },
    ]);
    setShowInactivityPrompt(false);
    setLastActivity(Date.now());
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const message = inputValue.trim();
      setMessages([
        ...messages,
        { role: "user", content: message, isTyping: false },
      ]);
      setInputValue("");
      handleActivity();

      // Send to avatar if live session is active
      if (hasLiveVideo && room) {
        sendDataToAvatar(message);
      } else {
        // Fallback response for non-live mode
        setTimeout(() => {
          const newMessageId = Date.now();
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Thanks for your message! I'm here to help you with any questions.",
              isTyping: true,
              id: newMessageId,
            },
          ]);
          setTypingMessageId(newMessageId);
        }, 1000);
      }
    }
  };

  const handleDisconnect = () => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setSessionInfo(null);
      setHasLiveVideo(false);
      setHasAudio(false);
    }
    if (localAudioRef.current) {
      localAudioRef.current.stop();
      localAudioRef.current = null;
    }
    if (remoteAudioRef.current) {
      document.body.removeChild(remoteAudioRef.current);
      remoteAudioRef.current = null;
    }
    setIsMuted(true);
    setAudioEnabled(true);
    setState("minimized");
    setShowChat(false);
    setShowInactivityPrompt(false);
  };

  const startLiveSession = async () => {
    if (isConnecting || room) return;

    setIsConnecting(true);
    try {
      const resp = await fetch("/api/create-liveavatar-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "widget-user" }),
      });

      if (!resp.ok) {
        throw new Error("Failed to create session");
      }

      const data = await resp.json();
      const { livekitUrl, livekitClientToken, sessionId } = data;

      setSessionInfo({ sessionId, livekitUrl });

      const r = new Room({
        adaptiveStream: false,
        dynacast: false,
      } as any);

      await r.connect(livekitUrl, livekitClientToken);

      if (!mountedRef.current) {
        r.disconnect();
        setIsConnecting(false);
        return;
      }

      setRoom(r);
      setHasLiveVideo(true);

      // Wire up comprehensive events
      wireRoomEvents(r);

      r.on(
        RoomEvent.TrackSubscribed,
        (
          track: RemoteTrack,
          publication: any,
          participant: RemoteParticipant
        ) => {
          console.log("Track subscribed:", track.kind, track.sid);
          if (track.kind === Track.Kind.Video) {
            console.log("Video track received, attaching...");
            setTimeout(() => attachTrackToDom(track), 100);
          } else if (track.kind === Track.Kind.Audio) {
            console.log("Audio track received, attaching...");
            attachAudioTrack(track);
          }
        }
      );

      r.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Video) {
          detachTrackFromDom(track);
        } else if (track.kind === Track.Kind.Audio) {
          detachAudioTrack(track);
        }
      });



      // Check for existing tracks with delay to ensure DOM is ready
      setTimeout(() => {
        const existingParticipants = Array.from(r.remoteParticipants.values());
        existingParticipants.forEach((participant) => {
          participant.trackPublications.forEach((publication) => {
            if (publication.isSubscribed && publication.track) {
              if (publication.track.kind === Track.Kind.Video) {
                attachTrackToDom(publication.track as RemoteTrack);
              } else if (publication.track.kind === Track.Kind.Audio) {
                attachAudioTrack(publication.track as RemoteTrack);
              }
            }
          });
        });
      }, 1000);
    } catch (err) {
      console.error("Failed to start live session:", err);
    }
    setIsConnecting(false);
  };

  const attachTrackToDom = (track: RemoteTrack) => {
    const videoContainer = document.getElementById("live-video-container");
    if (!videoContainer) {
      console.log("Video container not found, retrying...");
      setTimeout(() => attachTrackToDom(track), 500);
      return;
    }

    let videoEl = videoContainer.querySelector("video") as HTMLVideoElement;
    if (!videoEl) {
      videoEl = document.createElement("video");
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = false;
      videoEl.style.width = "100%";
      videoEl.style.height = "100%";
      videoEl.style.objectFit = "cover";
      videoEl.style.backgroundColor = "#000";
      videoContainer.appendChild(videoEl);
      console.log("Video element created and added");
    }

    track.attach(videoEl);
    setHasLiveVideo(true);

    // Force video to play
    videoEl.play().catch((e) => console.log("Video play failed:", e));
    console.log("Video track attached, video element:", videoEl);
  };

  const detachTrackFromDom = (track: RemoteTrack) => {
    track.detach();
  };

  const attachAudioTrack = (track: RemoteTrack) => {
    if (!remoteAudioRef.current) {
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioEl.style.display = "none";
      document.body.appendChild(audioEl);
      remoteAudioRef.current = audioEl;
      console.log("Audio element created");
    }
    track.attach(remoteAudioRef.current);
    setHasAudio(true);
    remoteAudioRef.current.muted = !audioEnabled;

    // Force audio to play
    remoteAudioRef.current
      .play()
      .catch((e) => console.log("Audio play failed:", e));
    console.log("Audio track attached, audio enabled:", audioEnabled);
  };

  const detachAudioTrack = (track: RemoteTrack) => {
    track.detach();
    setHasAudio(false);
    if (remoteAudioRef.current) {
      document.body.removeChild(remoteAudioRef.current);
      remoteAudioRef.current = null;
    }
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = audioEnabled;
    }
  };

  const toggleMicrophone = async () => {
    if (!room) return;

    if (localAudioRef.current) {
      // Unpublish microphone
      await (room as any).localParticipant.unpublishTrack(
        localAudioRef.current
      );
      localAudioRef.current.stop();
      localAudioRef.current = null;
      setIsMuted(true);
    } else {
      // Publish microphone
      try {
        const track = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
        localAudioRef.current = track;
        await (room as any).localParticipant.publishTrack(track);
        setIsMuted(false);
      } catch (e) {
        console.error("Failed to publish audio:", e);
      }
    }
  };

  const publishLocalAudio = async () => {
    if (!room) return;

    try {
      const track = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
      localAudioRef.current = track;
      await (room as any).localParticipant.publishTrack(track);
      setIsMuted(false);
      console.log("Microphone enabled successfully");
    } catch (e) {
      console.error("Failed to publish audio:", e);
      setIsMuted(true);
    }
  };

  // Comprehensive event handling from debug console
  const wireRoomEvents = (r: Room) => {
    // Data channel events for transcripts and agent state
    r.on(
      RoomEvent.DataReceived,
      (
        payload: Uint8Array,
        participant?: RemoteParticipant,
        kind?: DataPacket_Kind
      ) => {
        let decoded: string;
        try {
          decoded = new TextDecoder().decode(payload);
        } catch (e) {
          return;
        }

        let parsedJson: any = null;
        try {
          parsedJson = JSON.parse(decoded);
        } catch (e) {
          return;
        }

        if (parsedJson && parsedJson.type) {
          const msgType = parsedJson.type;

          // Avatar state changes
          if (msgType === "avatar_start_talking") {
            setIsAvatarSpeaking(true);
            setAvatarState("speaking");
          } else if (msgType === "avatar_stop_talking") {
            setIsAvatarSpeaking(false);
            setAvatarState("listening");
          } else if (msgType === "user_start_talking") {
            setIsUserSpeaking(true);
          } else if (msgType === "user_stop_talking") {
            setIsUserSpeaking(false);
          }
          // Transcription handling
          else if (msgType === "transcript" || msgType === "transcription") {
            const text = parsedJson.text || parsedJson.transcript || "";
            if (text) {
              setTranscripts((prev) =>
                [
                  ...prev,
                  {
                    type: "transcript",
                    text: text,
                    timestamp: Date.now(),
                  },
                ].slice(-10)
              );
              detectIntent(text, parsedJson, "user");
            }
          }
          // User speech
          else if (msgType === "user_transcript" || msgType === "user_speech") {
            const text = parsedJson.text || parsedJson.transcript || "";
            if (text) {
              setMessages((prev) => [
                ...prev,
                { role: "user", content: text, isTyping: false },
              ]);
              setTranscripts((prev) =>
                [
                  ...prev,
                  {
                    type: "user_speech",
                    text: text,
                    timestamp: Date.now(),
                  },
                ].slice(-10)
              );
              detectIntent(text, parsedJson, "user");
            }
          }
          // Avatar responses
          else if (
            msgType === "avatar_transcript" ||
            msgType === "avatar_speech" ||
            msgType === "llm_response"
          ) {
            const text = parsedJson.text || parsedJson.response || "";
            if (text) {
              const newMessageId = Date.now();
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: text,
                  isTyping: true,
                  id: newMessageId,
                },
              ]);
              setTypingMessageId(newMessageId);
              setTranscripts((prev) =>
                [
                  ...prev,
                  {
                    type: "avatar_speech",
                    text: text,
                    timestamp: Date.now(),
                  },
                ].slice(-10)
              );
              detectIntent(text, parsedJson, "avatar");
            }
          }
        }
      }
    );

    // Agent state changes
    r.on(
      RoomEvent.ParticipantAttributesChanged,
      (changedAttributes: any, participant: any) => {
        if (changedAttributes && changedAttributes["lk.agent.state"]) {
          const agentState = changedAttributes["lk.agent.state"];
          setAvatarState(agentState);
        }
      }
    );
  };

  // Intent detection system
  const intentActions = [
    {
      keywords: [
        "book a demo",
        "schedule a demo",
        "book demo",
        "set up demo",
        "arrange demo",
        "demo booking",
      ],
      action: () => {
        setShowBookingPopup(true);
        setDetectedIntents((prev) => [...prev, "book_demo"].slice(-5));
      },
      description: "Book demo",
    },
    {
      keywords: [
        "set up a meet",
        "schedule a meeting",
        "book a call",
        "arrange a meeting",
        "schedule a call",
      ],
      action: () => {
        setShowBookingPopup(true);
        setDetectedIntents((prev) => [...prev, "schedule_meeting"].slice(-5));
      },
      description: "Schedule meeting",
    },
    {
      keywords: [
        "increase screen",
        "make bigger",
        "full screen",
        "maximize",
        "larger screen",
      ],
      action: () => {
        setState("maximized");
        setDetectedIntents((prev) => [...prev, "maximize_screen"].slice(-5));
      },
      description: "Maximize screen",
    },
    {
      keywords: [
        "decrease screen",
        "make smaller",
        "minimize",
        "smaller screen",
      ],
      action: () => {
        setState("small");
        setDetectedIntents((prev) => [...prev, "minimize_screen"].slice(-5));
      },
      description: "Minimize screen",
    },
  ];

  const detectIntent = (
    transcript: string,
    fullData: any,
    source: "user" | "avatar"
  ) => {
    const lowerTranscript = transcript.toLowerCase();

    intentActions.forEach((intent) => {
      const matched = intent.keywords.some((keyword) =>
        lowerTranscript.includes(keyword.toLowerCase())
      );

      if (matched) {
        intent.action();
      }
    });
  };

  // Send data to avatar
  const sendDataToAvatar = async (message: string) => {
    if (!room) return;

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      await (room as any).localParticipant.publishData(
        data,
        DataPacket_Kind.RELIABLE
      );
    } catch (e) {
      console.error("Failed to send data:", e);
    }
  };

  const quickActions = [
    "Tell me about Qudemo's pro...",
    "How can I use Qudemo?",
    "What can you do?",
  ];

  const handleQuickAction = (action: string) => {
    setMessages([
      ...messages,
      { role: "user", content: action, isTyping: false },
    ]);
    handleActivity();
    setShowChat(true);

    // Send to avatar if live session is active
    if (hasLiveVideo && room) {
      sendDataToAvatar(action);
    } else {
      // Fallback response
      setTimeout(() => {
        const newMessageId = Date.now();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Great question! I'd be happy to help you with that.",
            isTyping: true,
            id: newMessageId,
          },
        ]);
        setTypingMessageId(newMessageId);
      }, 1000);
    }
  };

  const getCurrentWidth = () => {
    if (state === "minimized") return isMobile ? 80 : 120;
    if (state === "small")
      return showChat
        ? isMobile
          ? window.innerWidth - 32
          : 704
        : isMobile
        ? 280
        : 320;
    if (state === "medium")
      return showChat
        ? isMobile
          ? window.innerWidth - 32
          : 864
        : isMobile
        ? 320
        : 480;
    if (state === "maximized")
      return isMobile ? window.innerWidth - 32 : window.innerWidth * 0.8;
    return isMobile ? 280 : 420;
  };

  const getCurrentHeight = () => {
    if (state === "minimized") return isMobile ? 120 : 160;
    if (state === "small")
      return isMobile ? (showChat ? window.innerHeight * 0.9 : 360) : 420;
    if (state === "medium")
      return isMobile ? (showChat ? window.innerHeight * 0.9 : 440) : 520;
    if (state === "maximized")
      return isMobile
        ? window.innerHeight - 64
        : Math.min(720, window.innerHeight * 0.8);
    return 420;
  };

  const getPosition = () => {
    if (state === "maximized") {
      return {
        bottom: isMobile ? 16 : Math.max(32, window.innerHeight * 0.1),
        right: isMobile ? 16 : Math.max(32, window.innerWidth * 0.1),
      };
    }
    return { bottom: isMobile ? 16 : 32, right: isMobile ? 16 : 32 };
  };

  return (
    <AnimatePresence>
      <motion.div
        style={{
          position: "fixed",
          zIndex: 50,
          backgroundColor: "#1f2937",
          border: "1px solid #374151",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          transformOrigin: "bottom right",
          ...getPosition(),
        }}
        animate={{
          width: getCurrentWidth(),
          height: getCurrentHeight(),
          borderRadius: state === "minimized" ? 16 : 24,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        onClick={handleActivity}
      >
        {state === "minimized" ? (
          <button
            onClick={() => {
              setState("small");
              startLiveSession();
            }}
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
              overflow: "hidden",
              borderRadius: "16px",
              border: "none",
              cursor: "pointer",
              background: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundImage: "url(/ai-avatar.jpg)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                borderRadius: "16px",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                width: "12px",
                height: "12px",
                backgroundColor: "#3b82f6",
                borderRadius: "50%",
                animation: "pulse 2s infinite",
              }}
            />
          </button>
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: isMobile && showChat ? "column" : "row",
              backgroundColor: "#111827",
            }}
          >
            <AnimatePresence>
              {showInactivityPrompt && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "rgba(17, 24, 39, 0.9)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "16px",
                    zIndex: 50,
                  }}
                >
                  <h3
                    style={{
                      fontSize: "24px",
                      fontWeight: "600",
                      color: "#f9fafb",
                    }}
                  >
                    Are you still here?
                  </h3>
                  <button
                    onClick={handleCreateNewConversation}
                    style={{
                      backgroundColor: "#111827",
                      color: "#f9fafb",
                      border: "2px solid #374151",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <RefreshCw style={{ width: "16px", height: "16px" }} />
                    Continue conversation
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div
              style={{
                flex: showChat ? (state === "maximized" ? 1 : "none") : 1,
                width: showChat
                  ? state === "maximized"
                    ? "50%"
                    : isMobile
                    ? "100%"
                    : state === "small"
                    ? "320px"
                    : "480px"
                  : "100%",
                height: showChat && isMobile ? "55%" : "100%",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: state === "small" ? "8px" : "16px",
                  left: state === "small" ? "8px" : "16px",
                  right: state === "small" ? "8px" : "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  zIndex: 10,
                  gap: "8px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {state === "small" && (
                    <button
                      onClick={() => setState("medium")}
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        backdropFilter: "blur(4px)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        borderRadius: "6px",
                        padding: "8px",
                        cursor: "pointer",
                        color: "white",
                      }}
                    >
                      <Maximize2 style={{ width: "16px", height: "16px" }} />
                    </button>
                  )}

                  {state === "medium" && (
                    <>
                      <button
                        onClick={() => {
                          setState("small");
                          setShowChat(false);
                        }}
                        style={{
                          backgroundColor: "rgba(0, 0, 0, 0.7)",
                          backdropFilter: "blur(4px)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          borderRadius: "6px",
                          padding: "8px",
                          cursor: "pointer",
                          color: "white",
                        }}
                      >
                        <Minimize2 style={{ width: "16px", height: "16px" }} />
                      </button>
                      <button
                        onClick={() => setState("maximized")}
                        style={{
                          backgroundColor: "rgba(0, 0, 0, 0.7)",
                          backdropFilter: "blur(4px)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          borderRadius: "6px",
                          padding: "8px",
                          cursor: "pointer",
                          color: "white",
                        }}
                      >
                        <Maximize2 style={{ width: "16px", height: "16px" }} />
                      </button>
                    </>
                  )}

                  {state === "maximized" && (
                    <button
                      onClick={() => setState("medium")}
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        backdropFilter: "blur(4px)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        borderRadius: "6px",
                        padding: "8px",
                        cursor: "pointer",
                        color: "white",
                      }}
                    >
                      <Minimize2 style={{ width: "16px", height: "16px" }} />
                    </button>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => {
                      handleActivity();
                      setShowBookingPopup(true);
                    }}
                    style={{
                      backgroundColor: "#3b82f6",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: "50px",
                      fontSize: "12px",
                      fontWeight: "500",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Book a Meeting
                  </button>
                  <div
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                      backdropFilter: "blur(4px)",
                      borderRadius: "50px",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      padding: "4px 8px",
                      fontSize: "12px",
                      fontWeight: "500",
                      color: "white",
                    }}
                  >
                    Ambassador Catherine
                  </div>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "linear-gradient(135deg, rgba(55, 65, 81, 0.3), rgba(17, 24, 39, 1))",
                  position: "relative",
                  minHeight: 0,
                }}
              >
                {isConnecting ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        border: "2px solid white",
                        borderTop: "2px solid transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        marginBottom: "8px",
                      }}
                    />
                    <p style={{ fontSize: "14px" }}>
                      Connecting to LiveAvatar...
                    </p>
                  </div>
                ) : hasLiveVideo || room ? (
                  <div
                    id="live-video-container"
                    style={{
                      width: "100%",
                      height: "100%",
                      backgroundColor: "#000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    {!document
                      .getElementById("live-video-container")
                      ?.querySelector("video") && (
                      <div
                        style={{
                          color: "white",
                          fontSize: "14px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            marginBottom: "8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Video style={{ width: "16px", height: "16px" }} />
                          Waiting for video...
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            opacity: 0.7,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Volume2 style={{ width: "12px", height: "12px" }} />
                          Audio: {hasAudio ? "Connected" : "Connecting"}
                        </div>
                      </div>
                    )}
                  </div>
                ) : !isVoiceMode ? (
                  <AnimatePresence mode="wait">
                    {isTransitioning ? (
                      <motion.div
                        key="transition"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            border: "2px solid white",
                            borderTop: "2px solid transparent",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                            marginBottom: "8px",
                          }}
                        />
                        <p style={{ fontSize: "14px" }}>
                          {transitionToScreenShare
                            ? "Loading preview..."
                            : "Closing preview..."}
                        </p>
                      </motion.div>
                    ) : isScreenSharing ? (
                      <motion.div
                        key="screenshare"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        style={{
                          width: "100%",
                          height: "100%",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "32px",
                          }}
                        >
                          <img
                            src="/screenshare.png"
                            alt="Screen Share"
                            style={{
                              maxWidth: "100%",
                              maxHeight: "100%",
                              objectFit: "contain",
                              borderRadius: "8px",
                              boxShadow:
                                "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                            }}
                          />
                        </div>
                        <motion.div
                          initial={{ opacity: 0, x: 20, y: -20 }}
                          animate={{ opacity: 1, x: 0, y: 0 }}
                          transition={{ delay: 0.2 }}
                          style={{
                            position: "absolute",
                            top: "64px",
                            right: "16px",
                            width: "80px",
                            height: "80px",
                            borderRadius: "50%",
                            overflow: "hidden",
                            border: "3px solid white",
                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              backgroundImage: "url(/ai-avatar.jpg)",
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat",
                            }}
                          />
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="normal"
                        style={{
                          width: "100%",
                          height: "100%",
                          backgroundImage: "url(/ai-avatar.jpg)",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </AnimatePresence>
                ) : (
                  <motion.div
                    style={{
                      width: "100%",
                      height: "100%",
                      backgroundImage: "url(/ai-avatar.jpg)",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                )}

                {!showInactivityPrompt && !hasLiveVideo && !isVoiceMode && (
                  <motion.div
                    style={{
                      position: "absolute",
                      bottom:
                        state === "small"
                          ? "64px"
                          : state === "medium"
                          ? "64px"
                          : "80px",
                      left: 0,
                      right: 0,
                      display: "flex",
                      gap:
                        state === "small"
                          ? "4px"
                          : state === "medium"
                          ? "6px"
                          : "8px",
                      justifyContent:
                        state === "small" || state === "medium"
                          ? "flex-start"
                          : "center",
                      padding:
                        state === "small"
                          ? "0 24px"
                          : state === "medium"
                          ? "0 24px"
                          : "0 16px",
                      overflowX: "auto",
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {quickActions.map((action, i) => (
                      <motion.button
                        key={i}
                        onClick={() => handleQuickAction(action)}
                        style={{
                          padding:
                            state === "small"
                              ? "4px 8px"
                              : state === "medium"
                              ? "6px 10px"
                              : "8px 16px",
                          backgroundColor: "rgba(0, 0, 0, 0.7)",
                          color: "white",
                          borderRadius: "50px",
                          fontWeight: "500",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          backdropFilter: "blur(4px)",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          fontSize:
                            state === "small"
                              ? "12px"
                              : state === "medium"
                              ? "12px"
                              : "14px",
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {action}
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {hasLiveVideo && sessionInfo && (
                  <div
                    style={{
                      position: "absolute",
                      top: "60px",
                      left: "16px",
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                      color: "white",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      backdropFilter: "blur(4px)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    {/* <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Radio style={{ width: '10px', height: '10px', color: '#ef4444' }} />
                      Live Session
                    </div> */}
                    <div
                      style={{
                        fontSize: "10px",
                        opacity: 0.8,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {avatarState === "speaking" && (
                        <>
                          <MessageSquare
                            style={{ width: "10px", height: "10px" }}
                          />{" "}
                          Speaking
                        </>
                      )}
                      {avatarState === "listening" && (
                        <>
                          <Ear style={{ width: "10px", height: "10px" }} />{" "}
                          Listening
                        </>
                      )}
                      {avatarState === "thinking" && (
                        <>
                          <Brain style={{ width: "10px", height: "10px" }} />{" "}
                          Thinking
                        </>
                      )}
                      {avatarState === "idle" && (
                        <>
                          <Smile style={{ width: "10px", height: "10px" }} />{" "}
                          Ready
                        </>
                      )}
                    </div>
                    {isUserSpeaking && (
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#60a5fa",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Mic style={{ width: "10px", height: "10px" }} />
                        You're speaking
                      </div>
                    )}
                  </div>
                )}

                {detectedIntents.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "16px",
                      right: "16px",
                      backgroundColor: "rgba(255, 165, 0, 0.8)",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: "12px",
                      fontSize: "10px",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Target style={{ width: "10px", height: "10px" }} />
                      Intent:{" "}
                      {detectedIntents[detectedIntents.length - 1]?.replace(
                        "_",
                        " "
                      )}
                    </div>
                  </div>
                )}

                {transcripts.length > 0 && state === "maximized" && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100px",
                      left: "16px",
                      right: "16px",
                      backgroundColor: "rgba(0, 0, 0, 0.8)",
                      color: "white",
                      padding: "8px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      backdropFilter: "blur(4px)",
                      maxHeight: "120px",
                      overflowY: "auto",
                    }}
                  >
                    <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                      Recent Transcripts:
                    </div>
                    {transcripts.slice(-3).map((transcript, i) => (
                      <div
                        key={i}
                        style={{ marginBottom: "2px", opacity: 0.9 }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {transcript.type.includes("user") ? (
                            <User
                              style={{
                                width: "12px",
                                height: "12px",
                                color: "#60a5fa",
                              }}
                            />
                          ) : (
                            <Bot
                              style={{
                                width: "12px",
                                height: "12px",
                                color: "#10b981",
                              }}
                            />
                          )}
                          <span>{transcript.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    position: "absolute",
                    bottom: "2px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "300",
                      color: "rgba(255, 255, 255, 0.9)",
                      textShadow:
                        "0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.4)",
                    }}
                  >
                    Powered by{" "}
                    <a
                      href="https://qudemo.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#60a5fa",
                        fontWeight: "bold",
                        textDecoration: "none",
                        textShadow: "none",
                        transition: "color 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.color = "#93c5fd";
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.color = "#60a5fa";
                      }}
                    >
                      Qudemo
                    </a>
                  </span>
                </div>

                <div
                  style={{
                    position: "absolute",
                    bottom: "16px",
                    left:
                      state === "small"
                        ? "8px"
                        : state === "medium"
                        ? "12px"
                        : "16px",
                    right: showChat
                      ? "4px"
                      : state === "small"
                      ? "8px"
                      : state === "medium"
                      ? "12px"
                      : "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    zIndex: 10,
                  }}
                >
                  {!showInactivityPrompt && (
                    <>
                      <div
                        style={{
                          backgroundColor: "rgba(0, 0, 0, 0.7)",
                          backdropFilter: "blur(4px)",
                          borderRadius: "50px",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          padding: "4px",
                          display: "flex",
                        }}
                      >
                        <button
                          onClick={() => setIsVoiceMode(false)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "50px",
                            fontSize: "12px",
                            fontWeight: "500",
                            border: "none",
                            cursor: "pointer",
                            backgroundColor: !isVoiceMode
                              ? "rgba(255, 255, 255, 0.2)"
                              : "transparent",
                            color: !isVoiceMode
                              ? "white"
                              : "rgba(255, 255, 255, 0.5)",
                          }}
                        >
                          Video
                        </button>
                        <button
                          onClick={() => setIsVoiceMode(true)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "50px",
                            fontSize: "12px",
                            fontWeight: "500",
                            border: "none",
                            cursor: "pointer",
                            backgroundColor: isVoiceMode
                              ? "rgba(255, 255, 255, 0.2)"
                              : "transparent",
                            color: isVoiceMode
                              ? "white"
                              : "rgba(255, 255, 255, 0.5)",
                          }}
                        >
                          Voice
                        </button>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap:
                            state === "small"
                              ? "8px"
                              : state === "medium"
                              ? "10px"
                              : "12px",
                        }}
                      >
                        <button
                          onClick={
                            hasLiveVideo
                              ? toggleMicrophone
                              : () => setIsMuted(!isMuted)
                          }
                          style={{
                            width:
                              state === "small"
                                ? "40px"
                                : state === "medium"
                                ? "44px"
                                : "48px",
                            height:
                              state === "small"
                                ? "40px"
                                : state === "medium"
                                ? "44px"
                                : "48px",
                            backgroundColor: isMuted
                              ? "rgba(239, 68, 68, 0.7)"
                              : isUserSpeaking
                              ? "rgba(34, 197, 94, 0.7)"
                              : "rgba(0, 0, 0, 0.7)",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            backdropFilter: "blur(4px)",
                            cursor: "pointer",
                            color: "white",
                            animation: isUserSpeaking
                              ? "pulse 1s infinite"
                              : "none",
                          }}
                        >
                          {isMuted ? (
                            <MicOff style={{ width: "16px", height: "16px" }} />
                          ) : (
                            <Mic style={{ width: "16px", height: "16px" }} />
                          )}
                        </button>

                        {hasAudio && (
                          <button
                            onClick={toggleAudio}
                            style={{
                              width:
                                state === "small"
                                  ? "40px"
                                  : state === "medium"
                                  ? "44px"
                                  : "48px",
                              height:
                                state === "small"
                                  ? "40px"
                                  : state === "medium"
                                  ? "44px"
                                  : "48px",
                              backgroundColor: !audioEnabled
                                ? "rgba(239, 68, 68, 0.7)"
                                : isAvatarSpeaking
                                ? "rgba(34, 197, 94, 0.7)"
                                : "rgba(0, 0, 0, 0.7)",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              backdropFilter: "blur(4px)",
                              cursor: "pointer",
                              color: "white",
                              animation: isAvatarSpeaking
                                ? "pulse 1s infinite"
                                : "none",
                            }}
                          >
                            {!audioEnabled ? (
                              <VolumeX
                                style={{ width: "16px", height: "16px" }}
                              />
                            ) : (
                              <Volume2
                                style={{ width: "16px", height: "16px" }}
                              />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setShowChat(!showChat);
                            handleActivity();
                          }}
                          style={{
                            width:
                              state === "small"
                                ? "40px"
                                : state === "medium"
                                ? "44px"
                                : "48px",
                            height:
                              state === "small"
                                ? "40px"
                                : state === "medium"
                                ? "44px"
                                : "48px",
                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            cursor: "pointer",
                            color: "#3b82f6",
                          }}
                        >
                          <MessageCircle
                            style={{ width: "16px", height: "16px" }}
                          />
                        </button>
                        <button
                          onClick={handleDisconnect}
                          style={{
                            width:
                              state === "small"
                                ? "40px"
                                : state === "medium"
                                ? "44px"
                                : "48px",
                            height:
                              state === "small"
                                ? "40px"
                                : state === "medium"
                                ? "44px"
                                : "48px",
                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            cursor: "pointer",
                            color: "#ef4444",
                          }}
                        >
                          <PhoneOff style={{ width: "16px", height: "16px" }} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {showChat &&
                (state === "small" ||
                  state === "medium" ||
                  state === "maximized") && (
                  <motion.div
                    style={{
                      width:
                        state === "maximized"
                          ? "50%"
                          : isMobile
                          ? "100%"
                          : "384px",
                      height: isMobile ? "45%" : "100%",
                      borderLeft: isMobile ? "none" : "1px solid #374151",
                      borderTop: isMobile ? "1px solid #374151" : "none",
                      backgroundColor: "#1f2937",
                      display: "flex",
                      flexDirection: "column",
                      flexShrink: 0,
                    }}
                    initial={{ width: 0, opacity: 0 }}
                    animate={{
                      width:
                        state === "maximized" ? "50%" : isMobile ? "100%" : 384,
                      opacity: 1,
                    }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  >
                    <div
                      style={{
                        padding: "16px",
                        borderBottom: "1px solid #374151",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: "rgba(31, 41, 55, 0.5)",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      <h3
                        style={{
                          fontWeight: "600",
                          color: "#f9fafb",
                          margin: 0,
                        }}
                      >
                        Chat
                      </h3>
                      <button
                        onClick={() => setShowChat(false)}
                        style={{
                          width: "32px",
                          height: "32px",
                          backgroundColor: "transparent",
                          border: "none",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: "#f9fafb",
                        }}
                      >
                        <X style={{ width: "16px", height: "16px" }} />
                      </button>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                        backgroundColor: "#111827",
                        minHeight: 0,
                      }}
                    >
                      {messages.map((msg, i) => (
                        <motion.div
                          key={msg.id || i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          style={{
                            display: "flex",
                            justifyContent:
                              msg.role === "user" ? "flex-end" : "flex-start",
                          }}
                        >
                          <div
                            style={{
                              maxWidth: "80%",
                              borderRadius: "16px",
                              padding: "10px 16px",
                              backgroundColor:
                                msg.role === "user" ? "#3b82f6" : "#374151",
                              color: "#f9fafb",
                            }}
                          >
                            <p
                              style={{
                                fontSize: "14px",
                                whiteSpace: "pre-line",
                                margin: 0,
                              }}
                            >
                              {msg.role === "assistant" && msg.isTyping ? (
                                <TypingText
                                  text={msg.content}
                                  onComplete={() => {
                                    setMessages((prev) =>
                                      prev.map((m) =>
                                        m.id === msg.id
                                          ? { ...m, isTyping: false }
                                          : m
                                      )
                                    );
                                    setTypingMessageId(null);
                                  }}
                                />
                              ) : (
                                msg.content
                              )}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    <div
                      style={{
                        padding: "16px",
                        borderTop: "1px solid #374151",
                        backgroundColor: "rgba(31, 41, 55, 0.5)",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleSendMessage();
                            }
                          }}
                          placeholder="Type your message here..."
                          style={{
                            flex: 1,
                            height: "40px",
                            borderRadius: "6px",
                            border: "1px solid #4b5563",
                            backgroundColor: "#111827",
                            padding: "0 12px",
                            fontSize: "14px",
                            color: "#f9fafb",
                            outline: "none",
                          }}
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!inputValue.trim()}
                          style={{
                            width: "40px",
                            height: "40px",
                            backgroundColor: inputValue.trim()
                              ? "#3b82f6"
                              : "#6b7280",
                            border: "none",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: inputValue.trim()
                              ? "pointer"
                              : "not-allowed",
                            color: "white",
                            flexShrink: 0,
                          }}
                        >
                          <Send style={{ width: "16px", height: "16px" }} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
            </AnimatePresence>
          </div>
        )}

        <AnimatePresence>
          {showBookingPopup && (
            <motion.div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 50,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                style={{
                  backgroundColor: "white",
                  borderRadius: "16px",
                  padding: isMobile ? "16px" : "24px",
                  width: "320px",
                  maxWidth: "90%",
                  margin: "16px",
                }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <img
                    src="/ai-avatar.jpg"
                    alt="Catherine"
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                  <div>
                    <h3
                      style={{ fontWeight: "600", color: "#111827", margin: 0 }}
                    >
                      Book with Catherine
                    </h3>
                    <p
                      style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}
                    >
                      Qudemo Ambassador
                    </p>
                  </div>
                  <button
                    onClick={() => setShowBookingPopup(false)}
                    style={{
                      marginLeft: "auto",
                      backgroundColor: "transparent",
                      border: "none",
                      color: "#9ca3af",
                      cursor: "pointer",
                    }}
                  >
                    <X style={{ width: "20px", height: "20px" }} />
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "8px",
                      }}
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        backgroundColor: "white",
                        color: "#111827",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "8px",
                      }}
                    >
                      Select Date
                    </label>
                    <select
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        backgroundColor: "white",
                        color: "#111827",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="" style={{ color: "#6b7280" }}>
                        Choose a date
                      </option>
                      {availableDates.map((date) => (
                        <option
                          key={date}
                          value={date}
                          style={{ color: "#111827" }}
                        >
                          {new Date(date).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "8px",
                      }}
                    >
                      Select Time
                    </label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "8px",
                      }}
                    >
                      {timeSlots.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          style={{
                            padding: "8px",
                            fontSize: "14px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            cursor: "pointer",
                            backgroundColor:
                              selectedTime === time ? "#d1d5db" : "#f9fafb",
                            color:
                              selectedTime === time ? "#1f2937" : "#6b7280",
                          }}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (selectedDate && selectedTime && email) {
                        setShowBookingPopup(false);
                        const newMessageId = Date.now();
                        setMessages([
                          ...messages,
                          {
                            role: "assistant",
                            content: `Perfect! I've booked your meeting for ${new Date(
                              selectedDate
                            ).toLocaleDateString()} at ${selectedTime}. A confirmation email will be sent to ${email}.`,
                            isTyping: true,
                            id: newMessageId,
                          },
                        ]);
                        setTypingMessageId(newMessageId);
                        setSelectedDate("");
                        setSelectedTime("");
                        setEmail("");
                      }
                    }}
                    disabled={!selectedDate || !selectedTime || !email}
                    style={{
                      width: "100%",
                      backgroundColor:
                        !selectedDate || !selectedTime || !email
                          ? "#d1d5db"
                          : "#2563eb",
                      color: "white",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      fontWeight: "500",
                      border: "none",
                      cursor:
                        !selectedDate || !selectedTime || !email
                          ? "not-allowed"
                          : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <Calendar style={{ width: "16px", height: "16px" }} />
                    Book Meeting
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
