import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * claim-device Edge Function
 * 
 * PURPOSE: Associate a device with the current user, bypassing RLS.
 * This ensures VoIP tokens work regardless of which account originally registered them.
 * 
 * FLOW:
 * 1. Validate user from Authorization header
 * 2. Use SERVICE_ROLE to update devices.user_id = current user
 * 3. Return success/failure
 */

interface ClaimDeviceRequest {
  device_id: string;
}

Deno.serve(async (req) => {
  console.log('[claim-device] Function invoked');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[claim-device] No authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Parse request body
    let requestBody: ClaimDeviceRequest;
    try {
      requestBody = await req.json();
      console.log('[claim-device] Request:', JSON.stringify(requestBody));
    } catch (parseError) {
      console.error('[claim-device] Invalid request body:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { device_id } = requestBody;
    
    if (!device_id) {
      console.log('[claim-device] Missing device_id');
      return new Response(
        JSON.stringify({ success: false, error: 'device_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create user-context client to get the authenticated user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      console.log('[claim-device] Invalid user:', userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    console.log(`[claim-device] User: ${user.id.substring(0, 8)}..., Device: ${device_id.substring(0, 8)}...`);
    
    // Create admin client with SERVICE_ROLE to bypass RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check current state of this device
    const { data: existingDevice, error: fetchError } = await adminClient
      .from('devices')
      .select('device_id, user_id, voip_token')
      .eq('device_id', device_id)
      .maybeSingle();
    
    if (fetchError) {
      console.error('[claim-device] Error fetching device:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: `Fetch error: ${fetchError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log('[claim-device] Existing device state:', {
      exists: !!existingDevice,
      hasToken: !!existingDevice?.voip_token,
      currentUserId: existingDevice?.user_id?.substring(0, 8) || 'none',
      newUserId: user.id.substring(0, 8),
    });
    
    if (!existingDevice) {
      // Device doesn't exist yet - nothing to claim
      console.log('[claim-device] Device not found in DB, nothing to claim');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Device not registered yet',
          claimed: false,
          device_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    if (existingDevice.user_id === user.id) {
      // Already claimed by this user
      console.log('[claim-device] Device already belongs to this user');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Device already belongs to this user',
          claimed: true,
          device_id,
          has_token: !!existingDevice.voip_token,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // CLAIM: Update user_id to current user (using SERVICE_ROLE bypasses RLS)
    console.log(`[claim-device] Claiming device from ${existingDevice.user_id?.substring(0, 8) || 'none'} to ${user.id.substring(0, 8)}`);
    
    const { error: updateError, data: updateData } = await adminClient
      .from('devices')
      .update({
        user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('device_id', device_id)
      .select();
    
    if (updateError) {
      console.error('[claim-device] Update failed:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: `Update error: ${updateError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log('[claim-device] ✅ Device claimed successfully:', updateData);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Device claimed successfully',
        claimed: true,
        device_id,
        old_user_id: existingDevice.user_id?.substring(0, 8) || 'none',
        new_user_id: user.id.substring(0, 8),
        has_token: !!existingDevice.voip_token,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('[claim-device] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
