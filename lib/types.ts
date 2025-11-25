import { Room } from 'livekit-client';

// Video Trigger Configuration Types
export interface VideoTrigger {
  id: string;
  primaryKeywords: string[];
  secondaryKeywords: string[];
  videoUrl: string;
  description: string;
}

export interface VideoTriggersConfig {
  triggers: VideoTrigger[];
}

// LiveKit Room Extensions
export interface ExtendedRoom extends Room {
  disconnect: () => Promise<void>;
}

// Agent State Types
export type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';
