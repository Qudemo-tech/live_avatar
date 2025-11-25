'use client'
import React, { useEffect, useRef, useState } from 'react';
import {
  Room,
  RemoteParticipant,
  RemoteTrack,
  createLocalAudioTrack,
  LocalAudioTrack,
  RoomEvent,
  DataPacket_Kind,
  Track,
} from 'livekit-client';
import videoTriggers from '../config/video-triggers.json';

/**
 * LiveAvatar Debug Page - Enhanced Verbose Logging
 * Full visibility into all LiveKit events and data channel communication
 */

interface LogEntry {
  id: number;
  category: string;
  message: string;
  data?: any;
}

interface IntentAction {
  keywords: string[];
  action: (transcript: string, fullData: any) => void;
  description: string;
}

export default function LivekitDebugPage() {
  const [room, setRoom] = useState<Room | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [showMeetingPopup, setShowMeetingPopup] = useState(false);
  const [detectedIntents, setDetectedIntents] = useState<string[]>([]);
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const [isLogsExpanded, setIsLogsExpanded] = useState(false);
  const [agentState, setAgentState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [lastAvatarSpeech, setLastAvatarSpeech] = useState<string>('');
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>('');

  const localAudioRef = useRef<LocalAudioTrack | null>(null);
  const mountedRef = useRef(true);
  const logIdCounter = useRef(0);
  const demoVideoRef = useRef<HTMLVideoElement | null>(null);
  const previousAgentStateRef = useRef<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const lastAvatarSpeechRef = useRef<string>('');

  useEffect(() => {
    mountedRef.current = true;
    log('SYSTEM', 'Component mounted - ready to start session');

    return () => {
      mountedRef.current = false;
      log('SYSTEM', 'Component unmounting - cleaning up');

      try {
        if (room) {
          log('CLEANUP', 'Disconnecting room');
          (room as any).disconnect?.();
        }
      } catch (e) {
        log('CLEANUP', 'Error disconnecting room', e);
      }

      try {
        if (localAudioRef.current) {
          log('CLEANUP', 'Stopping local audio track');
          localAudioRef.current.stop?.();
        }
      } catch (e) {
        log('CLEANUP', 'Error stopping local audio', e);
      }

      localAudioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to handle video loading when demo starts playing
  useEffect(() => {
    if (isDemoPlaying && currentVideoUrl && demoVideoRef.current) {
      const demoVideo = demoVideoRef.current;
      log('DEMO', '📹 Setting video source in effect', { videoUrl: currentVideoUrl });

      demoVideo.src = currentVideoUrl;
      demoVideo.load();

      // Wait for video to be ready before playing
      demoVideo.addEventListener('loadeddata', () => {
        log('DEMO', '✅ Video loaded - attempting play');
      }, { once: true });

      demoVideo.addEventListener('canplay', () => {
        log('DEMO', '✅ Video ready to play');
      }, { once: true });

      const playPromise = demoVideo.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            log('DEMO', '▶️ Demo video playing from GCS');
          })
          .catch((error) => {
            log('ERROR', 'Video play failed', { error: error.message, videoUrl: currentVideoUrl });
            setIsDemoPlaying(false);
          });
      }
    }
  }, [isDemoPlaying, currentVideoUrl]);

  function log(category: string, message: string, data?: any) {
    const entry: LogEntry = {
      id: logIdCounter.current++,
      category,
      message,
      data: data !== undefined ? data : undefined,
    };
    
    setLogs(prev => [entry, ...prev].slice(0, 1000)); // Keep last 1000 logs
    
    // Also log to console for developer tools
    const prefix = `[${category}]`;
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }

  // === INTENT DETECTION SYSTEM ===
  const intentActions: IntentAction[] = [
    // Demo booking intent
    {
      keywords: ['book a demo', 'schedule a demo', 'book demo', 'set up demo', 'arrange demo', 'demo booking'],
      action: (transcript, data) => {
        log('INTENT_DETECTED', '📅 Demo booking intent detected!', { transcript });
        setShowMeetingPopup(true);
        setDetectedIntents(prev => [...prev, 'book_demo'].slice(-10));
      },
      description: 'Book demo'
    },
    // Meeting scheduling intents
    {
      keywords: ['set up a meet', 'schedule a meeting', 'book a call', 'arrange a meeting', 'schedule a call'],
      action: (transcript, data) => {
        log('INTENT_DETECTED', '📅 Meeting scheduling intent detected!', { transcript });
        setShowMeetingPopup(true);
        setDetectedIntents(prev => [...prev, 'schedule_meeting'].slice(-10));
      },
      description: 'Schedule meeting'
    },
    {
      keywords: ['send email', 'email me', 'send me an email', 'contact me by email'],
      action: (transcript, data) => {
        log('INTENT_DETECTED', '📧 Email intent detected!', { transcript });
        // Trigger email form popup
        alert('Email form would open here!\n\nTranscript: ' + transcript);
        setDetectedIntents(prev => [...prev, 'send_email'].slice(-10));
      },
      description: 'Send email'
    },
    {
      keywords: ['show pricing', 'what is the price', 'how much does it cost', 'pricing information'],
      action: (transcript, data) => {
        log('INTENT_DETECTED', '💰 Pricing inquiry detected!', { transcript });
        // Open pricing page/modal
        alert('Pricing page would open here!\n\nTranscript: ' + transcript);
        setDetectedIntents(prev => [...prev, 'show_pricing'].slice(-10));
      },
      description: 'Show pricing'
    },
    {
      keywords: ['show demo', 'see a demo', 'watch demo', 'demo video'],
      action: (transcript, data) => {
        log('INTENT_DETECTED', '🎥 Demo request detected!', { transcript });
        // Open demo video
        alert('Demo video would play here!\n\nTranscript: ' + transcript);
        setDetectedIntents(prev => [...prev, 'show_demo'].slice(-10));
      },
      description: 'Show demo'
    },
  ];

  function detectIntent(transcript: string, fullData: any, source: 'user' | 'avatar') {
    const lowerTranscript = transcript.toLowerCase();
    
    intentActions.forEach(intent => {
      const matched = intent.keywords.some(keyword => lowerTranscript.includes(keyword.toLowerCase()));
      
      if (matched) {
        log('INTENT_MATCH', `🎯 Matched: ${intent.description} (from ${source})`, {
          transcript,
          matchedKeywords: intent.keywords.filter(k => lowerTranscript.includes(k.toLowerCase())),
        });
        intent.action(transcript, fullData);
      }
    });
  }

  async function startSession() {
    if (isConnecting || room) {
      log('WARNING', 'Already connecting or connected');
      return;
    }

    setIsConnecting(true);
    log('SESSION', '=== STARTING NEW SESSION ===');

    try {
      // Call API to create session
      log('API', 'Requesting session from /api/create-liveavatar-session');
      
      const resp = await fetch('/api/create-liveavatar-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'browser-user' }),
      });

      log('API', `Response status: ${resp.status} ${resp.statusText}`);

      if (!resp.ok) {
        const txt = await resp.text();
        log('ERROR', 'API request failed', { status: resp.status, body: txt });
        setIsConnecting(false);
        return;
      }

      const data = await resp.json();
      log('API', 'Session created successfully', data);

      const { livekitUrl, livekitClientToken, sessionId, sessionToken } = data;
      
      if (!livekitUrl || !livekitClientToken) {
        log('ERROR', 'Missing LiveKit credentials in response', data);
        setIsConnecting(false);
        return;
      }

      setSessionInfo({ sessionId, sessionToken, livekitUrl });
      log('SESSION', 'Session Info', { sessionId, livekitUrl });

      // Create and connect to LiveKit room
      log('LIVEKIT', 'Creating LiveKit Room instance');
      const r = new Room({
        adaptiveStream: false,
        dynacast: false,
      } as any);

      log('LIVEKIT', `Connecting to ${livekitUrl}`);
      await r.connect(livekitUrl, livekitClientToken);

      if (!mountedRef.current) {
        log('WARNING', 'Component unmounted during connection - disconnecting');
        r.disconnect();
        setIsConnecting(false);
        return;
      }

      setRoom(r);
      log('LIVEKIT', '✅ Connected to LiveKit room', { name: r.name });
      log('SESSION', '=== SESSION ACTIVE - Ready to communicate ===');

      // Wire up all event listeners
      wireRoomEvents(r);
      
      setIsConnecting(false);

    } catch (err) {
      log('ERROR', 'Exception in startSession', err);
      setIsConnecting(false);
    }
  }

  function wireRoomEvents(r: Room) {
    log('EVENTS', 'Setting up room event listeners');

    // === CONNECTION EVENTS ===
    r.on(RoomEvent.Connected, () => {
      log('ROOM_EVENT', 'Connected');
    });

    r.on(RoomEvent.Disconnected, (reason?: any) => {
      log('ROOM_EVENT', 'Disconnected', reason);
    });

    r.on(RoomEvent.Reconnecting, () => {
      log('ROOM_EVENT', 'Reconnecting...');
    });

    r.on(RoomEvent.Reconnected, () => {
      log('ROOM_EVENT', 'Reconnected');
    });

    r.on(RoomEvent.ConnectionStateChanged, (state: any) => {
      log('ROOM_EVENT', 'ConnectionStateChanged', state);
    });

    // === PARTICIPANT EVENTS ===
    r.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      log('PARTICIPANT', 'ParticipantConnected', {
        identity: participant.identity,
        sid: participant.sid,
        name: participant.name,
        metadata: participant.metadata,
      });
      wireParticipantEvents(participant);
    });

    r.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      log('PARTICIPANT', 'ParticipantDisconnected', {
        identity: participant.identity,
        sid: participant.sid,
      });
    });

    // === TRACK EVENTS ===
    r.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: any, participant: RemoteParticipant) => {
      log('TRACK', 'TrackSubscribed', {
        kind: track.kind,
        sid: track.sid,
        source: track.source,
        participant: participant.identity,
      });
      attachTrackToDom(track, participant);
    });

    r.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: any, participant: RemoteParticipant) => {
      log('TRACK', 'TrackUnsubscribed', {
        kind: track.kind,
        sid: track.sid,
        participant: participant.identity,
      });
      detachTrackFromDom(track);
    });

    r.on(RoomEvent.TrackPublished, (publication: any, participant: RemoteParticipant) => {
      log('TRACK', 'TrackPublished', {
        trackSid: publication.trackSid,
        kind: publication.kind,
        source: publication.source,
        participant: participant.identity,
      });
    });

    r.on(RoomEvent.TrackUnpublished, (publication: any, participant: RemoteParticipant) => {
      log('TRACK', 'TrackUnpublished', {
        trackSid: publication.trackSid,
        participant: participant.identity,
      });
    });

    r.on(RoomEvent.TrackMuted, (publication: any, participant: any) => {
      log('TRACK', 'TrackMuted', {
        trackSid: publication.trackSid,
        participant: participant.identity,
      });
    });

    r.on(RoomEvent.TrackUnmuted, (publication: any, participant: any) => {
      log('TRACK', 'TrackUnmuted', {
        trackSid: publication.trackSid,
        participant: participant.identity,
      });
    });

    // === DATA CHANNEL EVENTS ===
    r.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant, kind?: DataPacket_Kind) => {
      let decoded: string;
      try {
        decoded = new TextDecoder().decode(payload);
      } catch (e) {
        decoded = `<decode error: ${e}>`;
      }

      // Try to parse as JSON for intelligent display
      let parsedJson: any = null;
      let isJson = false;
      try {
        parsedJson = JSON.parse(decoded);
        isJson = true;
      } catch (e) {
        // Not JSON, that's fine
      }

      // Intelligent logging based on message type
      if (isJson && parsedJson.type) {
        const msgType = parsedJson.type;
        
        // Avatar talking/listening state changes
        if (msgType === 'avatar_start_talking') {
          log('AVATAR_STATE', '🗣️ Avatar started speaking', {
            task_id: parsedJson.task_id,
          });
        } else if (msgType === 'avatar_stop_talking') {
          log('AVATAR_STATE', '🤐 Avatar stopped speaking', {
            task_id: parsedJson.task_id,
            duration_ms: parsedJson.duration_ms,
          });
        } else if (msgType === 'user_start_talking') {
          log('USER_STATE', '🎤 User started speaking', parsedJson);
        } else if (msgType === 'user_stop_talking') {
          log('USER_STATE', '🤐 User stopped speaking', parsedJson);
        }
        // Transcription messages
        else if (msgType === 'transcript' || msgType === 'transcription') {
          const text = parsedJson.text || parsedJson.transcript || 'N/A';
          log('TRANSCRIPTION', `📝 Transcription: "${text}"`, {
            speaker: parsedJson.speaker || parsedJson.from || 'unknown',
            is_final: parsedJson.is_final,
            full_data: parsedJson,
          });
          // Detect intent
          detectIntent(text, parsedJson, 'user');
        }
        // User speech transcription
        else if (msgType === 'user_transcript' || msgType === 'user_speech') {
          const text = parsedJson.text || parsedJson.transcript || 'N/A';
          log('USER_SPEECH', `🎙️ You said: "${text}"`, parsedJson);
          // Detect intent in user speech
          detectIntent(text, parsedJson, 'user');
        }
        // Avatar response transcription
        else if (msgType === 'avatar_transcript' || msgType === 'avatar_speech' || msgType === 'llm_response') {
          const text = parsedJson.text || parsedJson.response || 'N/A';
          log('AVATAR_SPEECH', `💬 Avatar said: "${text}"`, parsedJson);
          // Store last avatar speech (both ref and state)
          lastAvatarSpeechRef.current = text;
          setLastAvatarSpeech(text);
          // Detect intent in avatar speech
          detectIntent(text, parsedJson, 'avatar');
        }
        // Generic JSON message
        else {
          log('DATA_CHANNEL', `📨 JSON message (${msgType})`, parsedJson);
        }
      } else if (isJson) {
        // JSON but no type field - check for event_type
        if (parsedJson.event_type === 'user.transcription') {
          const text = parsedJson.text || 'N/A';
          log('USER_SPEECH', `🎙️ You said: "${text}"`, parsedJson);
          // Detect intent
          detectIntent(text, parsedJson, 'user');
        } else if (parsedJson.event_type === 'avatar.transcription') {
          const text = parsedJson.text || 'N/A';
          log('AVATAR_SPEECH', `💬 Avatar said: "${text}"`, parsedJson);
          // Store last avatar speech (both ref and state)
          lastAvatarSpeechRef.current = text;
          setLastAvatarSpeech(text);
          // Detect intent
          detectIntent(text, parsedJson, 'avatar');
        } else {
          log('DATA_CHANNEL', '📨 JSON data received', parsedJson);
        }
      } else {
        // Plain text or binary
        log('DATA_CHANNEL', '📨 Data received (raw)', {
          from: participant?.identity || participant?.sid || 'unknown',
          kind: kind,
          decoded: decoded,
          byteLength: payload.byteLength,
        });
      }
    });

    // === LOCAL TRACK EVENTS ===
    r.on(RoomEvent.LocalTrackPublished, (publication: any) => {
      log('LOCAL_TRACK', 'LocalTrackPublished', {
        trackSid: publication.trackSid,
        kind: publication.kind,
        source: publication.source,
      });
    });

    r.on(RoomEvent.LocalTrackUnpublished, (publication: any) => {
      log('LOCAL_TRACK', 'LocalTrackUnpublished', {
        trackSid: publication.trackSid,
      });
    });

    // === METADATA & ATTRIBUTES ===
    r.on(RoomEvent.RoomMetadataChanged, (metadata: string) => {
      log('ROOM_EVENT', 'RoomMetadataChanged', metadata);
    });

    r.on(RoomEvent.ParticipantMetadataChanged, (metadata: string | undefined, participant: any) => {
      log('PARTICIPANT', 'ParticipantMetadataChanged', {
        participant: participant.identity,
        metadata: metadata,
      });
    });

    r.on(RoomEvent.ParticipantAttributesChanged, (changedAttributes: any, participant: any) => {
      // Check if this is agent state change
      if (changedAttributes && changedAttributes['lk.agent.state']) {
        const newAgentState = changedAttributes['lk.agent.state'];
        let emoji = '🤖';
        if (newAgentState === 'listening') emoji = '👂';
        else if (newAgentState === 'thinking') emoji = '🤔';
        else if (newAgentState === 'speaking') emoji = '💬';

        log('AGENT_STATE', `${emoji} Agent is now: ${newAgentState.toUpperCase()}`, {
          participant: participant.identity,
          state: newAgentState,
          previousState: previousAgentStateRef.current,
        });

        // Check if avatar just finished speaking (transition from speaking to listening)
        if (previousAgentStateRef.current === 'speaking' && newAgentState === 'listening') {
          log('AGENT_STATE', '✅ Avatar finished speaking - checking for demo trigger (with 100ms delay)');
          // Small delay to ensure transcription has arrived
          setTimeout(() => {
            checkForDemoTrigger();
          }, 100);
        }

        // Update agent state
        previousAgentStateRef.current = newAgentState;
        setAgentState(newAgentState);
      } else {
        log('PARTICIPANT', 'ParticipantAttributesChanged', {
          participant: participant.identity,
          changedAttributes: changedAttributes,
        });
      }
    });

    // === CONNECTION QUALITY ===
    r.on(RoomEvent.ConnectionQualityChanged, (quality: any, participant: any) => {
      log('CONNECTION', 'ConnectionQualityChanged', {
        participant: participant.identity,
        quality: quality,
      });
    });

    // === MEDIA DEVICES ===
    r.on(RoomEvent.MediaDevicesChanged, () => {
      log('MEDIA', 'MediaDevicesChanged');
    });

    r.on(RoomEvent.ActiveDeviceChanged, (kind: string, deviceId: string) => {
      log('MEDIA', 'ActiveDeviceChanged', { kind, deviceId });
    });

    // === RECORDING & TRANSCRIPTION ===
    r.on(RoomEvent.RecordingStatusChanged, (recording: boolean) => {
      log('ROOM_EVENT', 'RecordingStatusChanged', { recording });
    });

    // Wire existing participants
    log('EVENTS', 'Checking for existing participants');
    const existingParticipants = Array.from(r.remoteParticipants.values());
    log('EVENTS', `Found ${existingParticipants.length} existing participants`);
    
    existingParticipants.forEach(participant => {
      log('PARTICIPANT', 'Wiring existing participant', {
        identity: participant.identity,
        sid: participant.sid,
      });
      wireParticipantEvents(participant);
      
      // Attach existing tracks
      participant.trackPublications.forEach(publication => {
        if (publication.isSubscribed && publication.track) {
          log('TRACK', 'Attaching existing track', {
            kind: publication.kind,
            sid: publication.trackSid,
          });
          attachTrackToDom(publication.track as RemoteTrack, participant);
        }
      });
    });

    log('EVENTS', '✅ All event listeners configured');
  }

  function wireParticipantEvents(participant: RemoteParticipant) {
    participant.on('trackSubscribed', (track: RemoteTrack) => {
      log('PARTICIPANT_EVENT', 'trackSubscribed', {
        participant: participant.identity,
        trackKind: track.kind,
        trackSid: track.sid,
      });
    });

    participant.on('trackUnsubscribed', (track: RemoteTrack) => {
      log('PARTICIPANT_EVENT', 'trackUnsubscribed', {
        participant: participant.identity,
        trackKind: track.kind,
        trackSid: track.sid,
      });
    });

    participant.on('trackMuted', (publication: any) => {
      log('PARTICIPANT_EVENT', 'trackMuted', {
        participant: participant.identity,
        trackSid: publication.trackSid,
      });
    });

    participant.on('trackUnmuted', (publication: any) => {
      log('PARTICIPANT_EVENT', 'trackUnmuted', {
        participant: participant.identity,
        trackSid: publication.trackSid,
      });
    });

    participant.on('isSpeakingChanged', (speaking: boolean) => {
      log('PARTICIPANT_EVENT', 'isSpeakingChanged', {
        participant: participant.identity,
        speaking: speaking,
      });
    });

    participant.on('connectionQualityChanged', (quality: any) => {
      log('PARTICIPANT_EVENT', 'connectionQualityChanged', {
        participant: participant.identity,
        quality: quality,
      });
    });
  }

  function attachTrackToDom(track: RemoteTrack, participant: RemoteParticipant) {
    try {
      const elId = `track-${track.sid}`;
      let el = document.getElementById(elId) as HTMLMediaElement | null;

      if (!el) {
        log('DOM', 'Creating new media element', {
          trackKind: track.kind,
          trackSid: track.sid,
          participant: participant.identity,
        });

        el = document.createElement(track.kind === Track.Kind.Audio ? 'audio' : 'video') as HTMLMediaElement;
        el.id = elId;
        el.autoplay = true;

        if (track.kind === Track.Kind.Video) {
          // Video controls and styling
          el.controls = true;
          el.style.width = '100%';
          el.style.height = '100%';
          el.style.maxWidth = '100%';
          el.style.border = 'none';
          el.style.borderRadius = '0';
          el.style.objectFit = 'contain';
          el.style.background = '#000';
        } else {
          // Audio elements - hide them completely
          el.controls = false;
          el.style.display = 'none';
        }

        let container = document.getElementById('lk-track-container');
        if (!container) {
          container = document.createElement('div');
          container.id = 'lk-track-container';
          container.style.position = 'relative';
          container.style.width = '100%';
          container.style.height = '70vh'; // Cinema mode height
          container.style.maxWidth = '1400px';
          container.style.margin = '0 auto';
          container.style.background = '#000';
          container.style.borderRadius = '8px';
          container.style.overflow = 'hidden';
          container.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
          document.getElementById('media-tracks-section')?.appendChild(container);
        }
        container.appendChild(el);
      }

      track.attach(el);
      log('DOM', '✅ Track attached to DOM', {
        trackKind: track.kind,
        trackSid: track.sid,
        elementId: elId,
        participant: participant.identity,
      });

    } catch (e) {
      log('ERROR', 'Failed to attach track to DOM', e);
    }
  }

  function detachTrackFromDom(track: RemoteTrack) {
    try {
      const elId = `track-${track.sid}`;
      const el = document.getElementById(elId);
      
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
        log('DOM', 'Track element removed from DOM', {
          trackKind: track.kind,
          trackSid: track.sid,
          elementId: elId,
        });
      }

      track.detach();
      
    } catch (e) {
      log('ERROR', 'Failed to detach track from DOM', e);
    }
  }

  async function publishLocalAudio() {
    if (!room) {
      log('WARNING', 'Cannot publish audio - not connected to room');
      return;
    }

    try {
      log('LOCAL_AUDIO', 'Creating local audio track');
      
      if (!localAudioRef.current) {
        const track = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
        localAudioRef.current = track;
        log('LOCAL_AUDIO', 'Local audio track created', {
          sid: track.sid,
          mediaStreamTrackId: track.mediaStreamTrack.id,
        });
      }

      log('LOCAL_AUDIO', 'Publishing local audio track to room');
      await (room as any).localParticipant.publishTrack(localAudioRef.current);
      log('LOCAL_AUDIO', '✅ Local audio published - you can now speak to the avatar');

    } catch (e) {
      log('ERROR', 'Failed to publish local audio', e);
    }
  }

  async function unpublishLocalAudio() {
    if (!room || !localAudioRef.current) {
      log('WARNING', 'No local audio to unpublish');
      return;
    }

    try {
      log('LOCAL_AUDIO', 'Unpublishing local audio track');
      await (room as any).localParticipant.unpublishTrack(localAudioRef.current);
      
      localAudioRef.current.stop();
      localAudioRef.current = null;
      
      log('LOCAL_AUDIO', '✅ Local audio unpublished and stopped');

    } catch (e) {
      log('ERROR', 'Failed to unpublish local audio', e);
    }
  }

  async function sendTestData() {
    if (!room) {
      log('WARNING', 'Cannot send data - not connected to room');
      return;
    }

    try {
      const message = `Test message from user`;
      const encoder = new TextEncoder();
      const data = encoder.encode(message);

      log('DATA_CHANNEL', '📤 Sending data', {
        message: message,
        byteLength: data.byteLength,
        kind: 'RELIABLE',
      });

      await (room as any).localParticipant.publishData(data, DataPacket_Kind.RELIABLE);
      log('DATA_CHANNEL', '✅ Data sent successfully');

    } catch (e) {
      log('ERROR', 'Failed to send data', e);
    }
  }

  async function getRoomStats() {
    if (!room) {
      log('WARNING', 'Not connected to room');
      return;
    }

    try {
      log('STATS', '=== ROOM STATISTICS ===');
      
      log('STATS', 'Room Info', {
        name: room.name,
        state: room.state,
      });

      const lp = (room as any).localParticipant;
      if (lp) {
        log('STATS', 'Local Participant', {
          sid: lp.sid,
          identity: lp.identity,
          name: lp.name,
          metadata: lp.metadata,
          trackPublicationsCount: lp.trackPublications.size,
        });

        lp.trackPublications.forEach((pub: any) => {
          log('STATS', 'Local Track Publication', {
            trackSid: pub.trackSid,
            kind: pub.kind,
            source: pub.source,
            muted: pub.isMuted,
          });
        });
      }

      const remoteParticipants = Array.from(room.remoteParticipants.values());
      log('STATS', `Remote Participants (${remoteParticipants.length})`);
      
      remoteParticipants.forEach((p: RemoteParticipant) => {
        log('STATS', 'Remote Participant', {
          sid: p.sid,
          identity: p.identity,
          name: p.name,
          metadata: p.metadata,
          trackPublicationsCount: p.trackPublications.size,
        });

        p.trackPublications.forEach((pub: any) => {
          log('STATS', 'Remote Track Publication', {
            trackSid: pub.trackSid,
            kind: pub.kind,
            source: pub.source,
            subscribed: pub.isSubscribed,
            muted: pub.isMuted,
          });
        });
      });

      log('STATS', '=== END STATISTICS ===');

    } catch (e) {
      log('ERROR', 'Failed to get room stats', e);
    }
  }

  function endSession() {
    if (!room) {
      log('WARNING', 'No active session to end');
      return;
    }

    try {
      log('SESSION', '=== ENDING SESSION ===');
      
      // Unpublish local audio if active
      if (localAudioRef.current) {
        log('CLEANUP', 'Stopping local audio');
        try {
          localAudioRef.current.stop();
          localAudioRef.current = null;
        } catch (e) {
          log('ERROR', 'Error stopping local audio', e);
        }
      }

      // Disconnect from room
      log('CLEANUP', 'Disconnecting from LiveKit room');
      room.disconnect();
      setRoom(null);
      setSessionInfo(null);

      // Clear video elements
      const container = document.getElementById('lk-track-container');
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }

      log('SESSION', '✅ Session ended - all resources cleaned up');

    } catch (e) {
      log('ERROR', 'Error during session cleanup', e);
    }
  }

  function clearLogs() {
    setLogs([]);
    log('SYSTEM', 'Logs cleared');
  }

  function checkForDemoTrigger() {
    // Use ref for immediate access to latest value
    const speech = lastAvatarSpeechRef.current;
    const lowerSpeech = speech.toLowerCase();
    log('DEMO_CHECK', `Checking last avatar speech: "${speech}"`);

    // Loop through all video triggers from config
    for (const trigger of videoTriggers.triggers) {
      const matched = trigger.keywords.some(keyword =>
        lowerSpeech.includes(keyword.toLowerCase())
      );

      if (matched) {
        log('DEMO_TRIGGER', `🎬 Demo trigger phrase detected! (${trigger.id})`, {
          matchedKeywords: trigger.keywords.filter(k => lowerSpeech.includes(k.toLowerCase())),
          videoUrl: trigger.videoUrl,
        });
        playDemoVideo(trigger.videoUrl);
        return; // Stop checking after first match
      }
    }

    log('DEMO_CHECK', '❌ No demo trigger phrase found in avatar speech');
  }

  function playDemoVideo(videoUrl: string) {
    if (isDemoPlaying) {
      log('DEMO', 'Demo already playing');
      return;
    }

    try {
      log('DEMO', '🎬 Starting demo video playback', { videoUrl });

      // Pause microphone
      if (room && localAudioRef.current) {
        log('DEMO', '🎤 Pausing microphone during demo');
        (room as any).localParticipant.setMicrophoneEnabled(false);
      }

      // Shrink avatar video to small overlay in bottom-right corner
      const container = document.getElementById('lk-track-container');
      if (container) {
        // Container stays in place
        container.style.position = 'relative';
        container.style.transition = 'all 0.5s ease';

        const videoElements = container.querySelectorAll('video');
        videoElements.forEach(video => {
          video.style.position = 'absolute';
          video.style.bottom = '80px';  // Higher up to avoid controls
          video.style.right = '20px';
          video.style.width = '200px';  // Small but visible
          video.style.height = 'auto';  // Maintain aspect ratio
          video.style.maxWidth = '200px';
          video.style.borderRadius = '0';  // No rounding - keep original shape
          video.style.objectFit = 'contain';  // Keep original resolution/aspect
          video.style.border = '2px solid rgba(255, 255, 255, 0.8)';
          video.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.6)';
          video.style.zIndex = '10';
          video.style.transition = 'all 0.5s ease';
        });
      }

      // Set state to trigger video loading in useEffect
      setCurrentVideoUrl(videoUrl);
      setIsDemoPlaying(true);

    } catch (e) {
      log('ERROR', 'Failed to start demo video', e);
      setIsDemoPlaying(false);
    }
  }

  function stopDemoVideo() {
    try {
      log('DEMO', '⏹️ Stopping demo video');
      setIsDemoPlaying(false);
      setCurrentVideoUrl('');

      // Resume microphone
      if (room && localAudioRef.current) {
        log('DEMO', '🎤 Resuming microphone after demo');
        (room as any).localParticipant.setMicrophoneEnabled(true);
      }

      // Restore avatar video to normal size
      const container = document.getElementById('lk-track-container');
      if (container) {
        container.style.position = 'relative';
        container.style.width = '100%';
        container.style.height = '70vh';
        container.style.maxWidth = '1400px';
        container.style.margin = '0 auto';
        container.style.background = '#000';
        container.style.borderRadius = '8px';
        container.style.overflow = 'hidden';
        container.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';

        const videoElements = container.querySelectorAll('video');
        videoElements.forEach(video => {
          video.style.position = 'static';
          video.style.width = '100%';
          video.style.height = '100%';
          video.style.maxWidth = '100%';
          video.style.border = 'none';
          video.style.borderRadius = '0';
          video.style.objectFit = 'contain';
          video.style.background = '#000';
          video.style.zIndex = 'auto';
        });
      }

      // Reset demo video
      const demoVideo = demoVideoRef.current;
      if (demoVideo) {
        demoVideo.pause();
        demoVideo.currentTime = 0;
        demoVideo.src = '';
      }

      log('DEMO', '✅ Demo video stopped - avatar restored');

    } catch (e) {
      log('ERROR', 'Failed to stop demo video', e);
    }
  }

  return (
    <div id="main-container" style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '8px' }}>HeyGen LiveAvatar Debug Console</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Comprehensive logging for LiveKit room events and data channel communication
      </p>

      {/* Session Info Display */}
      {sessionInfo && (
        <div style={{
          padding: '16px',
          background: '#e8f5e9',
          border: '2px solid #4CAF50',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          <strong>Active Session:</strong>
          <div style={{ marginTop: '8px', fontSize: '14px', fontFamily: 'monospace' }}>
            <div>Session ID: {sessionInfo.sessionId}</div>
            <div>LiveKit URL: {sessionInfo.livekitUrl}</div>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={startSession}
          disabled={isConnecting || !!room}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: room ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: room ? 'not-allowed' : 'pointer',
          }}
        >
          {isConnecting ? 'Connecting...' : room ? 'Connected' : 'Start Session'}
        </button>

        <button
          onClick={publishLocalAudio}
          disabled={!room}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: !room ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: !room ? 'not-allowed' : 'pointer',
          }}
        >
          🎤 Start Speaking
        </button>

        <button
          onClick={unpublishLocalAudio}
          disabled={!room || !localAudioRef.current}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: !room || !localAudioRef.current ? '#ccc' : '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: !room || !localAudioRef.current ? 'not-allowed' : 'pointer',
          }}
        >
          🔇 Stop Speaking
        </button>

        <button
          onClick={sendTestData}
          disabled={!room}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: !room ? '#ccc' : '#9C27B0',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: !room ? 'not-allowed' : 'pointer',
          }}
        >
          📨 Send Test Data
        </button>

        <button
          onClick={getRoomStats}
          disabled={!room}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: !room ? '#ccc' : '#607D8B',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: !room ? 'not-allowed' : 'pointer',
          }}
        >
          📊 Get Stats
        </button>

        <button
          onClick={endSession}
          disabled={!room}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: !room ? '#ccc' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: !room ? 'not-allowed' : 'pointer',
          }}
        >
          ❌ End Session
        </button>

        <button
          onClick={clearLogs}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: '#9E9E9E',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          🗑️ Clear Logs
        </button>
      </div>

      {/* Demo Status Display */}
      {isDemoPlaying && (
        <div style={{
          padding: '16px',
          background: '#e3f2fd',
          border: '2px solid #2196F3',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          <strong>🎬 Demo Playing</strong>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#555' }}>
            Microphone paused • Avatar in headshot mode • Logs expandable below
          </p>
        </div>
      )}

      {/* Detected Intents Display */}
      {detectedIntents.length > 0 && (
        <div style={{
          padding: '16px',
          background: '#fff3e0',
          border: '2px solid #FF9800',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          <strong>🎯 Detected Intents:</strong>
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {detectedIntents.map((intent, idx) => (
              <span
                key={idx}
                style={{
                  padding: '4px 12px',
                  background: '#FF9800',
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {intent.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Meeting/Demo Booking Popup Modal */}
      {showMeetingPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '16px', color: '#333' }}>
              📅 Book a Demo
            </h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              Great! Let's schedule a time to show you how our product works.
            </p>
            
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Your Name"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  boxSizing: 'border-box',
                }}
              />
              <input
                type="email"
                placeholder="Your Email"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  boxSizing: 'border-box',
                }}
              />
              <input
                type="tel"
                placeholder="Phone Number (optional)"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowMeetingPopup(false);
                  log('UI', 'Demo booking popup closed');
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  background: '#9E9E9E',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowMeetingPopup(false);
                  log('UI', 'Demo booking submitted');
                  alert('Demo booking submitted! (This would integrate with your calendar system)');
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Book Demo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== VIDEO CONTAINER (Avatar + Demo Video) ===== */}
      <div id="media-tracks-section" style={{ marginBottom: '24px', position: 'relative' }}>
        {/* Avatar track container will be created dynamically here */}

        {/* Demo video overlays inside the same container */}
        {isDemoPlaying && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            height: '100%',
            maxWidth: '1400px',
            zIndex: 5,
          }}>
            <video
              ref={demoVideoRef}
              controls
              autoPlay
              preload="metadata"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                background: '#000',
                objectFit: 'contain',
              }}
              onEnded={stopDemoVideo}
              onError={(e) => {
                log('ERROR', 'Demo video failed to load', e);
                stopDemoVideo();
              }}
            />
            <button
              onClick={stopDemoVideo}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                padding: '8px 16px',
                background: 'rgba(244, 67, 54, 0.95)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              ⏹️ Stop Demo
            </button>
          </div>
        )}
      </div>

      {/* ===== EVENT LOG - EXPANDABLE/COLLAPSIBLE ===== */}
      <div style={{
        border: '2px solid #333',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <div
          onClick={() => setIsLogsExpanded(!isLogsExpanded)}
          style={{
            background: '#333',
            color: '#fff',
            padding: '12px 16px',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <span>
            {isLogsExpanded ? '▼' : '▶'} Live Logs ({logs.length} entries)
          </span>
          <span style={{ fontSize: '12px', color: '#aaa' }}>
            {isLogsExpanded ? 'Click to collapse' : 'Click to expand'}
          </span>
        </div>

        {isLogsExpanded && (
          <div
            id="log-container"
            style={{
              maxHeight: '600px',
              overflow: 'auto',
              background: '#1e1e1e',
              color: '#f0f0f0',
              fontFamily: 'monospace',
              fontSize: '13px',
              padding: '12px',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
            }}
          >
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', padding: '12px' }}>
                No logs yet. Click "Start Session" to begin.
              </div>
            ) : (
              logs.map((entry) => {
                const dataStr = entry.data !== undefined ? '\n' + JSON.stringify(entry.data, null, 2) : '';
                return `[${entry.category}] ${entry.message}${dataStr}\n\n`;
              }).join('')
            )}
          </div>
        )}
      </div>

    </div>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    SYSTEM: '#9E9E9E',
    SESSION: '#4CAF50',
    API: '#2196F3',
    LIVEKIT: '#00BCD4',
    EVENTS: '#9C27B0',
    ROOM_EVENT: '#673AB7',
    PARTICIPANT: '#3F51B5',
    PARTICIPANT_EVENT: '#5C6BC0',
    TRACK: '#FF9800',
    LOCAL_TRACK: '#FFC107',
    LOCAL_AUDIO: '#FFEB3B',
    DATA_CHANNEL: '#E91E63',
    AVATAR_STATE: '#00E676',
    AVATAR_SPEECH: '#64DD17',
    USER_STATE: '#2196F3',
    USER_SPEECH: '#03A9F4',
    AGENT_STATE: '#9C27B0',
    TRANSCRIPTION: '#FFEB3B',
    INTENT_DETECTED: '#FF6F00',
    INTENT_MATCH: '#FF9100',
    UI: '#607D8B',
    DOM: '#795548',
    CONNECTION: '#607D8B',
    MEDIA: '#8BC34A',
    STATS: '#00BCD4',
    CLEANUP: '#FF5722',
    WARNING: '#FF9800',
    ERROR: '#f44336',
  };
  return colors[category] || '#FFFFFF';
}