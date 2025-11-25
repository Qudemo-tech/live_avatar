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

The application includes an automatic demo video playback system that triggers when the avatar says specific phrases. Video triggers are configured in `/config/video-triggers.json`.

**Configuration:**

Edit `/config/video-triggers.json` to add video URLs with their trigger keywords:

```json
{
  "triggers": [
    {
      "id": "demo-video",
      "keywords": [
        "rendering demo for you",
        "render demo for you",
        "rendering the demo",
        "showing demo",
        "show you the demo"
      ],
      "videoUrl": "https://storage.googleapis.com/your-bucket/demo.mp4",
      "description": "Main demo video"
    }
  ]
}
```

**Adding More Videos:**

Simply add more trigger objects to support multiple videos. The system will match keywords and play the corresponding video from the public GCS URL.

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
- Supports multiple videos with different trigger phrases
- Uses `preload="metadata"` for faster startup
