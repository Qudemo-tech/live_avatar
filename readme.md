# LiveAvatar FULL Mode Debug Console

Debug console with **MAXIMUM VERBOSE LOGGING** for HeyGen LiveAvatar FULL mode.

## Setup

```bash
# 1. Install
npm install

# 2. Configure
cp .env.local.example .env.local
# Edit .env.local with your credentials

# 3. Configure Video Triggers (Optional)
# Edit config/video-triggers.json to add video URLs and trigger keywords
# Videos are loaded from public GCS URLs - no need to store locally

# 4. Run
npm run dev
```

## Get Your Credentials

### HeyGen API Key
1. Go to https://app.heygen.com/settings?nav=API
2. Copy your API key

### Avatar ID
1. Go to https://labs.heygen.com/interactive-avatar
2. Click "Select Avatar"
3. Copy the avatar ID

### Voice ID
1. Go to https://app.heygen.com (main dashboard)
2. Go to "AI Voices"
3. Copy the voice ID you want

### Context ID (Optional)
1. Go to https://labs.heygen.com/interactive-avatar
2. Click "Knowledge Base"
3. Create or select a knowledge base
4. Copy the ID

## Run

```bash
npm run dev
```

Open http://localhost:3000/liveavatar-debug

## What You'll See

**Backend Logs** (Terminal):
- Every API call with timing
- Full request/response payloads
- Error details

**Frontend Logs** (Browser):
- Every event that fires
- User speech transcripts
- Avatar speech transcripts
- Connection status changes
- All available hooks

## Events You Can Listen To

```
sessionStarted
sessionEnded
sessionError
avatarStartedSpeaking
avatarStoppedSpeaking
avatarMessage (what avatar said)
userStartedSpeaking
userStoppedSpeaking
userMessage (what you said)
connected
disconnected
streamReady
```

## Usage

1. Click "Start Session"
2. Allow microphone
3. **Just start talking**
4. Avatar will respond with AI
5. Watch logs to see everything happening

## Logs Location

- **Backend**: Terminal where `npm run dev` is running
- **Frontend**: Browser console + on-screen debug panel

## Demo Video Playback Feature

### How It Works

The application includes an intelligent demo video playback system that triggers when the avatar says specific phrases. It uses **token-based keyword matching** to determine which video to play based on company names mentioned. Video triggers are configured in `/config/video-triggers.json`.

**Configuration:**

Edit `/config/video-triggers.json` to configure video URLs with primary and secondary keywords:

```json
{
  "triggers": [
    {
      "id": "nvidia-demo",
      "primaryKeywords": ["rendering", "render", "demo"],
      "secondaryKeywords": ["nvidia", "gpu"],
      "videoUrl": "https://storage.googleapis.com/video_db/nvidia.mp4",
      "description": "Nvidia-specific demo"
    },
    {
      "id": "microsoft-demo",
      "primaryKeywords": ["rendering", "render", "demo"],
      "secondaryKeywords": ["microsoft", "enterprise"],
      "videoUrl": "https://storage.googleapis.com/video_db/microsoft.mp4",
      "description": "Microsoft-specific demo"
    },
    {
      "id": "generic-demo",
      "primaryKeywords": ["rendering", "render", "demo"],
      "secondaryKeywords": [],
      "videoUrl": "https://storage.googleapis.com/video_db/demo.mp4",
      "description": "Generic demo (fallback)"
    }
  ]
}
```

**Keyword Matching Logic:**

1. **Primary Keywords**: Must contain "rendering" (or "render") AND "demo"
2. **Secondary Keywords**: Company-specific identifiers (nvidia, microsoft, apple, google)
3. **Fallback**: If no secondary keywords match, plays generic demo

**Examples:**

- Avatar says: "rendering demo right now" → Plays **generic demo** (no company)
- Avatar says: "rendering nvidia demo" → Plays **Nvidia demo**
- Avatar says: "nvidia rendering demo" → Plays **Nvidia demo** (word order doesn't matter)
- Avatar says: "rendering demo for google workspace" → Plays **Google demo**

**Adding More Videos:**

Add new trigger objects with unique secondary keywords. The system matches company names to play the correct video.

**State Tracking:**
- Uses React refs (`previousAgentStateRef`, `lastAvatarSpeechRef`) for immediate value access
- Avoids React closure issues in event handlers
- Tracks avatar state: idle → listening → thinking → speaking

**Triggering Process:**
1. Avatar finishes speaking (state changes from `speaking` to `listening`)
2. System waits 100ms for transcription to arrive
3. Checks last avatar speech for trigger phrases
4. If matched, starts demo video playback

**During Demo:**
- **Microphone**: Automatically paused (`setMicrophoneEnabled(false)`)
- **Avatar Video**: Shrinks to 200px overlay in bottom-right corner
  - No border radius (keeps original shape)
  - White border with shadow for visibility
  - Positioned at `bottom: 80px, right: 20px`
  - `zIndex: 10` to stay above demo video
- **Demo Video**: Fills the container (cinema mode: 70vh height, 1400px max width)
  - Overlays at `zIndex: 5`
- **Logs**: Collapsible/expandable (default collapsed)

**After Demo:**
- Microphone automatically resumes
- Avatar video returns to full size
- Demo video resets to start

**Cinema Mode Layout:**
- Container: 70vh height, 1400px max width
- Avatar fills screen by default
- Demo overlays with avatar floating in corner (YouTube-style)

### Technical Details

**Why Refs + State:**
- **Refs**: Immediate synchronous access for event handlers
- **State**: Triggers UI re-renders
- **100ms Delay**: Ensures transcription arrives before checking

**Audio Elements:**
- Hidden completely (`display: none`)
- No visible controls
- Remain functional in background

**Video Source:**
- Videos are loaded from public GCS URLs configured in `/config/video-triggers.json`
- No local video storage required
- Supports multiple videos with company-specific triggers
- Uses `preload="metadata"` for faster startup

**Token-Based Matching:**
- Speech is tokenized (split into words)
- Word order doesn't matter: "nvidia demo rendering" = "rendering nvidia demo"
- Case-insensitive matching
- Filler words are ignored: "rendering demo for you" works perfectly
- First company match wins (if multiple company names present)
- Generic demo is fallback when no company keywords detected
