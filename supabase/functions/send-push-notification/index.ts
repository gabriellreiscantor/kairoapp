import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Get OAuth2 access token for FCM (Android)
async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: exp
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const pemContents = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signatureB64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Create APNs JWT for iOS push notifications
async function createAPNsJWT(teamId: string, keyId: string, privateKey: string): Promise<string> {
  const header = {
    alg: 'ES256',
    kid: keyId
  };
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: teamId,
    iat: now
  };
  
  // Base64url encode
  const base64UrlEncode = (str: string): string => {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };
  
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  // Clean up the private key - handle both PEM formats
  let pemContents = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  // Convert base64 to binary
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  // Import the key for ECDSA P-256 signing
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  // Sign with ECDSA
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    encoder.encode(unsignedToken)
  );
  
  // Convert to raw r||s format (64 bytes)
  const signatureB64 = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${unsignedToken}.${signatureB64}`;
}

// Send push via APNs (iOS)
async function sendAPNsPush(
  deviceToken: string, 
  title: string, 
  body: string, 
  data: Record<string, string> = {}
): Promise<{ success: boolean; error?: string }> {
  const teamId = Deno.env.get('APNS_TEAM_ID');
  const keyId = Deno.env.get('APNS_KEY_ID');
  const privateKey = Deno.env.get('APNS_PRIVATE_KEY');
  
  if (!teamId || !keyId || !privateKey) {
    console.error('[APNs] Missing APNs credentials');
    return { success: false, error: 'APNs not configured' };
  }
  
  try {
    const jwt = await createAPNsJWT(teamId, keyId, privateKey);
    
    // Clean device token (remove spaces if any)
    const cleanToken = deviceToken.replace(/\s/g, '').toLowerCase();
    
    const apnsPayload = {
      aps: {
        alert: {
          title,
          body
        },
        sound: 'default',
        badge: 1,
        'mutable-content': 1
      },
      ...data
    };
    
    console.log('[APNs] Sending push to token:', cleanToken.substring(0, 20) + '...');
    
    const apnsResponse = await fetch(`https://api.push.apple.com/3/device/${cleanToken}`, {
      method: 'POST',
      headers: {
        'authorization': `bearer ${jwt}`,
        'apns-topic': 'com.kairo', // Bundle ID
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'apns-expiration': '0',
        'content-type': 'application/json'
      },
      body: JSON.stringify(apnsPayload)
    });
    
    if (!apnsResponse.ok) {
      const errorText = await apnsResponse.text();
      console.error('[APNs] Error:', apnsResponse.status, errorText);
      return { success: false, error: `APNs error ${apnsResponse.status}: ${errorText}` };
    }
    
    const apnsId = apnsResponse.headers.get('apns-id');
    console.log('[APNs] Push sent successfully, apns-id:', apnsId);
    
    return { success: true };
  } catch (error) {
    console.error('[APNs] Exception:', error);
    return { success: false, error: String(error) };
  }
}

// Send push via FCM (Android)
async function sendFCMPush(
  serviceAccount: any,
  fcmToken: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const accessToken = await getAccessToken(serviceAccount);
    console.log('[FCM] Got access token');
    
    const projectId = serviceAccount.project_id;
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    
    const message = {
      message: {
        token: fcmToken,
        notification: {
          title,
          body
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            channel_id: 'kairo_alerts',
            sound: 'default'
          }
        }
      }
    };

    const fcmResponse = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    if (!fcmResponse.ok) {
      const errorText = await fcmResponse.text();
      console.error('[FCM] Error:', errorText);
      return { success: false, error: `FCM error: ${errorText}` };
    }

    const result = await fcmResponse.json();
    console.log('[FCM] Push sent successfully:', result);
    
    return { success: true, messageId: result.name };
  } catch (error) {
    console.error('[FCM] Exception:', error);
    return { success: false, error: String(error) };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, data }: PushNotificationRequest = await req.json();
    console.log('[Push] Sending notification to user:', user_id);

    // Get user's push token and platform from Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('fcm_token, fcm_token_platform')
      .eq('id', user_id)
      .maybeSingle();

    if (profileError) {
      console.error('[Push] Error fetching profile:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    if (!profile?.fcm_token) {
      console.log('[Push] No push token for user');
      return new Response(
        JSON.stringify({ success: false, error: 'No push token registered' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = profile.fcm_token;
    const platform = profile.fcm_token_platform || 'android'; // Default to Android/FCM for backward compatibility
    
    console.log('[Push] Token platform:', platform, 'Token length:', token.length);
    
    let result: { success: boolean; error?: string; messageId?: string };
    
    if (platform === 'ios') {
      // iOS: Use APNs directly with the device token
      console.log('[Push] Using APNs for iOS device');
      result = await sendAPNsPush(token, title, body, data || {});
    } else {
      // Android: Use FCM
      console.log('[Push] Using FCM for Android device');
      const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');
      if (!serviceAccountJson) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not configured');
      }
      const serviceAccount = JSON.parse(serviceAccountJson);
      result = await sendFCMPush(serviceAccount, token, title, body, data || {});
    }
    
    if (!result.success) {
      console.error('[Push] Failed to send:', result.error);
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Push] Notification sent successfully');
    return new Response(
      JSON.stringify({ success: true, message_id: result.messageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Push] Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
