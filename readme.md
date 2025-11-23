# LiveAvatar FULL Mode Debug Console

Debug console with **MAXIMUM VERBOSE LOGGING** for HeyGen LiveAvatar FULL mode.

## Setup

```bash
# 1. Install
npm install

# 2. Configure
cp .env.local.example .env.local
# Edit .env.local with your credentials

# 3. Run
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
