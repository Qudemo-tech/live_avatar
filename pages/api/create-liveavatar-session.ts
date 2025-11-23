// pages/api/create-liveavatar-session.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type Json = Record<string, any>;

function redactKey(k?: string | null) {
  if (!k) return '<MISSING>';
  const safe = String(k);
  if (safe.length <= 10) return '***REDACTED***';
  return `${safe.slice(0,6)}...${safe.slice(-4)} (len=${safe.length})`;
}

async function safeText(resp: Response) {
  try {
    return await resp.text();
  } catch (e) {
    return `<unable to read body: ${String(e)}>`;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Json>) {
  console.log('\n' + '='.repeat(80));
  console.log('>>> NEW REQUEST TO create-liveavatar-session <<<');
  console.log('='.repeat(80));
  
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const heygenApiKey = process.env.HEYGEN_API_KEY;
  const avatarId = process.env.HEYGEN_AVATAR_ID;
  const voiceId = process.env.HEYGEN_VOICE_ID;
  const contextId = process.env.HEYGEN_CONTEXT_ID;

  console.log('\n📋 ENVIRONMENT VARIABLES CHECK:');
  console.log('  HEYGEN_API_KEY:', redactKey(heygenApiKey));
  console.log('  HEYGEN_AVATAR_ID:', avatarId ?? '<MISSING>');
  console.log('  HEYGEN_VOICE_ID:', voiceId ?? '<MISSING>');
  console.log('  HEYGEN_CONTEXT_ID:', contextId ?? '<MISSING>');

  if (!heygenApiKey || !avatarId || !voiceId) {
    console.error('❌ FATAL: Missing required environment variables');
    return res.status(500).json({ error: 'Missing env vars' });
  }

  try {
    // --- STEP 1: CREATE SESSION TOKEN ---
    console.log('\n' + '─'.repeat(80));
    console.log('STEP 1: Creating session token');
    console.log('─'.repeat(80));
    
    const tokenUrl = 'https://api.liveavatar.com/v1/sessions/token';
    const tokenPayload = {
      mode: 'FULL',
      avatar_id: avatarId,
      avatar_persona: {
        voice_id: voiceId,
        context_id: contextId,
        language: 'en',
      },
    };

    console.log('📤 REQUEST:');
    console.log('  URL:', tokenUrl);
    console.log('  Method: POST');
    console.log('  Headers:', {
      'X-API-KEY': redactKey(heygenApiKey),
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    });
    console.log('  Payload:', JSON.stringify(tokenPayload, null, 2));

    const tokenOptions = {
      method: 'POST',
      headers: {
        'X-API-KEY': heygenApiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenPayload),
    };

    const tokenResp = await fetch(tokenUrl, tokenOptions as any).catch(e => {
      console.error('❌ FETCH FAILED:', String(e));
      throw new Error('fetch-token-failed: ' + String(e));
    });

    const tokenRespText = await safeText(tokenResp);

    console.log('\n📥 RESPONSE:');
    console.log('  Status:', tokenResp.status, tokenResp.statusText);
    console.log('  Headers:', JSON.stringify(Object.fromEntries(tokenResp.headers.entries()), null, 2));
    console.log('  Body (raw):', tokenRespText);

    let tokenData: any = null;
    try {
      tokenData = JSON.parse(tokenRespText);
      console.log('  Body (parsed):', JSON.stringify(tokenData, null, 2));
    } catch (e) {
      console.log('  ⚠️  Body is not valid JSON');
    }

    if (!tokenResp.ok) {
      console.error('❌ TOKEN REQUEST FAILED');
      console.error('  Status:', tokenResp.status);
      console.error('  Response:', tokenData ?? tokenRespText);
      return res.status(tokenResp.status || 500).json({
        error: 'Failed to create session token',
        details: tokenData ?? tokenRespText
      });
    }

    const sessionToken = tokenData?.data?.session_token;
    const sessionId = tokenData?.data?.session_id;

    console.log('\n✅ TOKEN RESPONSE PARSED:');
    console.log('  session_id:', sessionId || '<MISSING>');
    console.log('  session_token:', sessionToken ? `${sessionToken.slice(0, 10)}... (len=${sessionToken.length})` : '<MISSING>');

    if (!sessionToken || !sessionId) {
      console.error('❌ MALFORMED TOKEN RESPONSE - missing session_token or session_id');
      return res.status(500).json({
        error: 'Malformed token response',
        details: tokenData ?? tokenRespText
      });
    }

    // --- STEP 2: START SESSION ---
    console.log('\n' + '─'.repeat(80));
    console.log('STEP 2: Starting session');
    console.log('─'.repeat(80));

    const startUrl = 'https://api.liveavatar.com/v1/sessions/start';
    const startPayload = { session_id: sessionId };

    console.log('📤 REQUEST:');
    console.log('  URL:', startUrl);
    console.log('  Method: POST');
    console.log('  Headers:', {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken.slice(0, 10)}... (len=${sessionToken.length})`,
    });
    console.log('  Payload:', JSON.stringify(startPayload, null, 2));

    const startOptions = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(startPayload),
    };

    const startResp = await fetch(startUrl, startOptions as any).catch(e => {
      console.error('❌ FETCH FAILED:', String(e));
      throw new Error('fetch-start-failed: ' + String(e));
    });

    const startRespText = await safeText(startResp);

    console.log('\n📥 RESPONSE:');
    console.log('  Status:', startResp.status, startResp.statusText);
    console.log('  Headers:', JSON.stringify(Object.fromEntries(startResp.headers.entries()), null, 2));
    console.log('  Body (raw):', startRespText);

    let startData: any = null;
    try {
      startData = JSON.parse(startRespText);
      console.log('  Body (parsed):', JSON.stringify(startData, null, 2));
    } catch (e) {
      console.log('  ⚠️  Body is not valid JSON');
    }

    if (!startResp.ok) {
      console.error('❌ START REQUEST FAILED');
      console.error('  Status:', startResp.status);
      console.error('  Response:', startData ?? startRespText);
      return res.status(startResp.status || 500).json({
        error: 'Failed to start session',
        details: startData ?? startRespText
      });
    }

    // Extract livekit info (support both nested and flat structures)
    const livekitUrl = startData?.data?.livekit_url ?? startData?.livekit_url ?? null;
    const livekitClientToken = startData?.data?.livekit_client_token ?? startData?.livekit_client_token ?? null;

    console.log('\n✅ START RESPONSE PARSED:');
    console.log('  livekit_url:', livekitUrl || '<MISSING>');
    console.log('  livekit_client_token:', livekitClientToken ? `${livekitClientToken.slice(0, 10)}... (len=${livekitClientToken.length})` : '<MISSING>');

    if (!livekitUrl || !livekitClientToken) {
      console.warn('⚠️  START SUCCEEDED BUT MISSING LIVEKIT INFO');
      console.warn('  Full response:', JSON.stringify(startData, null, 2));
      return res.status(200).json({
        sessionId,
        sessionToken,
        warning: 'startSucceededButNoLivekitInfo',
        startData
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ SUCCESS - Returning LiveKit credentials to client');
    console.log('='.repeat(80) + '\n');

    return res.status(200).json({
      sessionId,
      sessionToken,
      livekitUrl,
      livekitClientToken
    });

  } catch (err) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ EXCEPTION IN HANDLER');
    console.error('='.repeat(80));
    console.error(err);
    console.error('='.repeat(80) + '\n');
    
    return res.status(500).json({
      error: 'internal',
      details: err instanceof Error ? err.message : String(err)
    });
  }
}