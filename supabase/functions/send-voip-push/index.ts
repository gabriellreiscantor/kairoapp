import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoIPPushRequest {
  user_id: string;
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apnsKeyId = Deno.env.get('APNS_KEY_ID');
    const apnsTeamId = Deno.env.get('APNS_TEAM_ID');
    const apnsPrivateKey = Deno.env.get('APNS_PRIVATE_KEY');
    const appBundleId = 'com.kairo'; // App bundle ID for VoIP
    
    if (!apnsKeyId || !apnsTeamId || !apnsPrivateKey) {
      console.error('Missing APNs configuration');
      return new Response(
        JSON.stringify({ success: false, error: 'APNs not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { user_id, event_id, event_title, event_time, event_location, event_emoji }: VoIPPushRequest = await req.json();
    
    console.log(`Sending VoIP push for event: ${event_id} to user: ${user_id}`);
    
    // Fetch user's VoIP token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('voip_token, display_name')
      .eq('id', user_id)
      .maybeSingle();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }
    
    const voipToken = profile?.voip_token;
    
    if (!voipToken) {
      console.log(`User ${user_id} has no VoIP token`);
      return new Response(
        JSON.stringify({ success: false, error: 'No VoIP token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    console.log(`Found VoIP token for user, sending push...`);
    
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
    
    console.log(`VoIP push sent successfully to user ${user_id}`);
    
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
