import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoIPPushRequest {
  device_id: string; // Primary key for VoIP lookup (device-centric architecture)
  user_id?: string; // Optional, for logging only
  event_id: string;
  event_title: string;
  event_time?: string;
  event_location?: string;
  event_emoji?: string;
}

// Convert base64 to Uint8Array for JWT signing
function base64ToUint8Array(base64: string): Uint8Array {
  const raw = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}

// Create APNs JWT token
async function createAPNsJWT(teamId: string, keyId: string, privateKey: string): Promise<string> {
  const header = {
    alg: 'ES256',
    kid: keyId,
  };
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: teamId,
    iat: now,
  };
  
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  
  // Parse the PEM private key
  const pemContents = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const keyData = base64ToUint8Array(pemContents);
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData.buffer as ArrayBuffer,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput)
  );
  
  // Convert signature to base64url
  const signatureArray = new Uint8Array(signature);
  let signatureBase64 = btoa(String.fromCharCode(...signatureArray));
  signatureBase64 = signatureBase64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${signingInput}.${signatureBase64}`;
}

Deno.serve(async (req) => {
  console.log('[send-voip-push] Function invoked');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body first to log what we received
    let requestBody: VoIPPushRequest;
    try {
      requestBody = await req.json();
      console.log('[send-voip-push] Received request:', JSON.stringify(requestBody));
    } catch (parseError) {
      console.error('[send-voip-push] Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const { device_id, user_id, event_id, event_title, event_time, event_location, event_emoji } = requestBody;
    
    if (!device_id) {
      console.error('[send-voip-push] Missing device_id in request');
      return new Response(
        JSON.stringify({ success: false, error: 'device_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`[send-voip-push] Processing VoIP for event: ${event_id}, device: ${device_id}, user: ${user_id || 'N/A'}, title: ${event_title}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apnsKeyId = Deno.env.get('APNS_KEY_ID');
    const apnsTeamId = Deno.env.get('APNS_TEAM_ID');
    const apnsPrivateKey = Deno.env.get('APNS_PRIVATE_KEY');
    const appBundleId = 'com.kairo'; // App bundle ID for VoIP
    
    // Log which secrets are configured (without revealing values)
    console.log('[send-voip-push] Secrets check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasApnsKeyId: !!apnsKeyId,
      hasApnsTeamId: !!apnsTeamId,
      hasApnsPrivateKey: !!apnsPrivateKey,
      apnsKeyIdPreview: apnsKeyId ? `${apnsKeyId.substring(0, 4)}...` : 'NOT SET',
      apnsTeamIdPreview: apnsTeamId ? `${apnsTeamId.substring(0, 4)}...` : 'NOT SET',
    });
    
    if (!apnsKeyId || !apnsTeamId || !apnsPrivateKey) {
      console.error('[send-voip-push] Missing APNs configuration - cannot send VoIP');
      return new Response(
        JSON.stringify({ success: false, error: 'APNs not configured', details: { hasKeyId: !!apnsKeyId, hasTeamId: !!apnsTeamId, hasPrivateKey: !!apnsPrivateKey } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[send-voip-push] Missing Supabase configuration');
      return new Response(
        JSON.stringify({ success: false, error: 'Supabase not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log(`[send-voip-push] Fetching VoIP token from devices table for device: ${device_id}`);
    
    // ✅ DEVICE-CENTRIC: Fetch VoIP token by device_id, not user_id
    // This ensures the VoIP push goes to the device that created the event
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('voip_token, user_id')
      .eq('device_id', device_id)
      .maybeSingle();
    
    if (deviceError) {
      console.error('[send-voip-push] Error fetching device:', deviceError);
      return new Response(
        JSON.stringify({ success: false, error: `Device fetch error: ${deviceError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const voipToken = device?.voip_token;
    
    console.log(`[send-voip-push] Device data:`, {
      hasDevice: !!device,
      hasVoipToken: !!voipToken,
      deviceUserId: device?.user_id || 'NULL',
      voipTokenPreview: voipToken ? `${voipToken.substring(0, 20)}...` : 'NULL',
    });
    
    if (!voipToken) {
      console.log(`[send-voip-push] Device ${device_id} has no VoIP token - CANNOT SEND`);
      return new Response(
        JSON.stringify({ success: false, error: 'No VoIP token for device', device_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    console.log(`[send-voip-push] VoIP token found, preparing APNs request...`);
    
    // Create APNs JWT
    const jwt = await createAPNsJWT(apnsTeamId, apnsKeyId, apnsPrivateKey);
    
    // VoIP Push payload - MUST use fields the capacitor-plugin-callkit-voip expects
    // Required fields: id, name, media
    // NOTE: duration REMOVED to prevent premature call termination
    const payload = {
      aps: {
        'content-available': 1,
      },
      // Fields required by capacitor-plugin-callkit-voip to show native CallKit screen
      id: event_id,
      name: `${event_emoji || '📅'} ${event_title}`,
      media: 'audio',
      // duration removed - call stays active until endCallFromJS is called
      // Custom data for our app to use after call is answered
      eventId: event_id,
      eventTitle: event_title,
      eventTime: event_time || '',
      eventLocation: event_location || '',
      eventEmoji: event_emoji || '📅',
    };
    
    console.log(`[VoIP] Sending payload:`, JSON.stringify(payload));
    
    // Send to APNs HTTP/2
    // CRITICAL: apns-topic MUST end with .voip for VoIP pushes!
    const apnsUrl = `https://api.push.apple.com/3/device/${voipToken}`;
    const voipTopic = `${appBundleId}.voip`; // = 'com.kairo.voip'
    
    console.log(`[VoIP] Using topic: ${voipTopic}`);
    
    const response = await fetch(apnsUrl, {
      method: 'POST',
      headers: {
        'authorization': `bearer ${jwt}`,
        'apns-topic': voipTopic, // MUST be 'com.kairo.voip' not 'com.kairo'
        'apns-push-type': 'voip',
        'apns-priority': '10',
        'apns-expiration': '0',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`APNs error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: `APNs error: ${response.status}`, details: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    console.log(`VoIP push sent successfully to device ${device_id}`);
    
    return new Response(
      JSON.stringify({ success: true, message: 'VoIP push sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('Error in send-voip-push:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
