import { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { remoteLog } from '@/lib/remoteLogger';
import { getOrCreateDeviceId } from '@/hooks/useDeviceId';

interface CallKitEvent {
  id: string;
  title: string;
  emoji?: string;
  time?: string;
  location?: string;
}

interface UseCallKitAlertReturn {
  isCallVisible: boolean;
  currentEvent: CallKitEvent | null;
  showCall: (event: CallKitEvent, language?: string) => void;
  handleAnswer: () => void;
  handleDecline: () => void;
  handleSnooze: () => void;
  isPlaying: boolean;
  registerVoIPToken: () => Promise<{ success: boolean; message: string }>;
  resetVoIPState: () => Promise<void>;
}

// Check if running on iOS native device
const isIOSNative = () => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
};

export const useCallKitAlert = (): UseCallKitAlertReturn => {
  const [isCallVisible, setIsCallVisible] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<CallKitEvent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentLanguageRef = useRef('pt-BR');
  const currentEventRef = useRef<CallKitEvent | null>(null);
  const isCallingTTSRef = useRef(false);
  const callKitPluginRef = useRef<any>(null);
  const hasRegisteredRef = useRef(false);
  const pendingTokenRef = useRef<string | null>(null);
  const preloadedTTSRef = useRef<string | null>(null);
  const preloadingTTSRef = useRef<Promise<string | null> | null>(null);
  const hasInitializedRef = useRef(false);
  const safetyTimeoutRef = useRef<number | null>(null);
  const deviceIdRef = useRef<string | null>(null);

  // Sync currentEvent to ref
  useEffect(() => {
    currentEventRef.current = currentEvent;
  }, [currentEvent]);

  // Force cleanup all state
  const forceCleanupAllState = useCallback(() => {
    console.log('[CallKit] 🧹 Force cleaning up ALL state...');
    
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
    
    isCallingTTSRef.current = false;
    preloadedTTSRef.current = null;
    preloadingTTSRef.current = null;
    
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
      } catch (e) {
        console.log('[CallKit] Error stopping audio in force cleanup:', e);
      }
      audioRef.current = null;
    }
    
    if (callKitPluginRef.current?.stopTTSAudio) {
      callKitPluginRef.current.stopTTSAudio().catch((e: any) => {
        console.log('[CallKit] Error stopping native TTS in force cleanup:', e);
      });
    }
    
    setIsPlaying(false);
    setIsCallVisible(false);
    setCurrentEvent(null);
  }, []);

  // ✅ NEW: Save VoIP token to devices table (device-based, not user-based)
  // CRITICAL: voip_token is the PRIMARY identifier since iOS preserves it across reinstalls
  // The device_id in the database becomes the source of truth - we recover it from there
  const saveVoIPToken = useCallback(async (token: string): Promise<boolean> => {
    console.log('[CallKit] ========================================');
    console.log('[CallKit] ====== SAVE VOIP TOKEN STARTED v5 ======');
    console.log('[CallKit] ========================================');
    console.log('[CallKit] Token (first 30):', token?.substring(0, 30));
    console.log('[CallKit] Token length:', token?.length);
    console.log('[CallKit] Timestamp:', new Date().toISOString());
    
    remoteLog.info('voip', 'save_voip_token_started_v5', {
      tokenLength: token?.length,
      tokenPreview: token?.substring(0, 20) + '...',
      timestamp: new Date().toISOString(),
    });
    
    try {
      // Store token in memory for immediate use
      pendingTokenRef.current = token;
      console.log('[CallKit] Step 1: Token stored in memory');
      
      // Get current user (may be null if not logged in)
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;
      console.log('[CallKit] Step 2: Got user -', userId ? userId : 'NOT LOGGED IN');
      
      remoteLog.info('voip', 'save_voip_got_user', {
        userId: userId?.substring(0, 8) || 'null',
        isLoggedIn: !!userId,
      });
      
      // ✅ PRIORITY 1: Check if this voip_token already exists in the database
      // This is the KEY to surviving app reinstalls - voip_token is preserved by iOS!
      console.log('[CallKit] Step 3: Querying database for existing voip_token...');
      const { data: existingDevice, error: lookupError } = await supabase
        .from('devices')
        .select('device_id, user_id')
        .eq('voip_token', token)
        .maybeSingle();
      
      console.log('[CallKit] Step 4: Query result -', {
        found: !!existingDevice,
        error: lookupError?.message || 'none',
        deviceId: existingDevice?.device_id?.substring(0, 8) || 'null',
        existingUserId: existingDevice?.user_id?.substring(0, 8) || 'null',
      });
      
      remoteLog.info('voip', 'save_voip_lookup_result', {
        found: !!existingDevice,
        error: lookupError?.message || null,
        deviceId: existingDevice?.device_id?.substring(0, 8) || null,
        existingUserId: existingDevice?.user_id?.substring(0, 8) || null,
      });
      
      if (lookupError) {
        console.error('[CallKit] ERROR looking up existing device:', lookupError);
        remoteLog.error('voip', 'token_lookup_failed', { error: lookupError.message });
      }
      
      let nativeDeviceId: string;
      
      if (existingDevice) {
        // ✅ RECOVERY MODE: Token exists in DB - use the device_id from there!
        nativeDeviceId = existingDevice.device_id;
        console.log('[CallKit] ✅ RECOVERED device_id from database:', nativeDeviceId.substring(0, 8) + '...');
        
        // Save to localStorage so future calls use this same ID
        localStorage.setItem('horah_device_id', nativeDeviceId);
        console.log('[CallKit] 💾 Saved recovered device_id to localStorage');
        
        remoteLog.info('voip', 'device_id_recovered_from_db', {
          deviceId: nativeDeviceId.substring(0, 8) + '...',
          hadUserId: !!existingDevice.user_id,
        });
        
        // Update user_id if we have a logged-in user and the record doesn't have one
        // or if the user_id has changed (different account login)
        if (userId && existingDevice.user_id !== userId) {
          console.log('[CallKit] 📝 Updating user_id for recovered device...');
          const { error: updateError } = await supabase
            .from('devices')
            .update({
              user_id: userId,
              updated_at: new Date().toISOString(),
            })
            .eq('voip_token', token);
          
          if (updateError) {
            console.error('[CallKit] Failed to update user_id:', updateError);
          } else {
            console.log('[CallKit] ✅ user_id updated successfully');
          }
        }
        
        deviceIdRef.current = nativeDeviceId;
        
        toast({
          title: "Me Ligue ativado",
          description: "Você receberá chamadas nativas para seus lembretes",
          duration: 3000,
        });
        
        return true;
      }
      
      // ✅ NEW DEVICE: Token doesn't exist in DB - get/create device_id
      console.log('[CallKit] 📱 Token not in database - getting device ID...');
      nativeDeviceId = await getOrCreateDeviceId();
      deviceIdRef.current = nativeDeviceId;
      console.log('[CallKit] Device ID:', nativeDeviceId.substring(0, 8) + '...');
      
      // Insert new device record
      console.log('[CallKit] Inserting new device record...');
      const { error, data } = await supabase
        .from('devices')
        .upsert({
          device_id: nativeDeviceId,
          voip_token: token,
          user_id: userId,
          platform: 'ios',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'device_id'
        })
        .select();
      
      if (error) {
        console.error('[CallKit] Failed to save VoIP token:', error);
        remoteLog.error('voip', 'token_save_failed_v4', { 
          error: error.message,
          code: error.code,
          deviceId: nativeDeviceId.substring(0, 8) + '...',
        });
        return false;
      }
      
      console.log('[CallKit] ====== TOKEN SAVED SUCCESSFULLY ======');
      console.log('[CallKit] Saved device record:', JSON.stringify(data));
      remoteLog.info('voip', 'token_saved_success_v4', {
        deviceId: nativeDeviceId.substring(0, 8) + '...',
        userId: userId ? userId.substring(0, 8) + '...' : 'none',
        tokenLength: token?.length,
      });
      
      toast({
        title: "Me Ligue ativado",
        description: "Você receberá chamadas nativas para seus lembretes",
        duration: 3000,
      });
      
      return true;
    } catch (error) {
      console.error('[CallKit] Error saving VoIP token:', error);
      remoteLog.error('voip', 'token_save_exception_v4', { 
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }, [toast]);

  // Try to register VoIP with retries
  const attemptVoIPRegistration = useCallback(async (retryCount = 0): Promise<void> => {
    if (!isIOSNative()) {
      remoteLog.info('voip', 'registration_skip_not_ios');
      return;
    }
    
    if (hasRegisteredRef.current && pendingTokenRef.current) {
      remoteLog.info('voip', 'registration_skip_already_have_token', { 
        tokenLength: pendingTokenRef.current.length 
      });
      return;
    }

    const maxRetries = 3;
    const TOKEN_TIMEOUT_MS = 10000;
    
    try {
      console.log(`[CallKit] Registration attempt ${retryCount + 1}/${maxRetries + 1}`);
      remoteLog.info('voip', 'registration_attempt_start', { 
        attempt: retryCount + 1, 
        maxAttempts: maxRetries + 1 
      });
      
      if (!callKitPluginRef.current) {
        remoteLog.info('voip', 'plugin_import_start');
        const { CallKitVoip } = await import('capacitor-plugin-callkit-voip');
        callKitPluginRef.current = CallKitVoip;
        remoteLog.info('voip', 'plugin_import_success', { 
          methods: Object.keys(CallKitVoip || {}).join(',') 
        });
      }
      
      remoteLog.info('voip', 'calling_register', { 
        timestamp: new Date().toISOString() 
      });
      
      await callKitPluginRef.current.register();
      hasRegisteredRef.current = true;
      
      remoteLog.info('voip', 'register_returned', { 
        timestamp: new Date().toISOString(),
        note: 'register() returned, waiting for token callback from iOS...',
      });
      
      setTimeout(async () => {
        remoteLog.info('voip', 'token_timeout_check', {
          hasToken: !!pendingTokenRef.current,
          tokenLength: pendingTokenRef.current?.length,
          timeoutMs: TOKEN_TIMEOUT_MS,
        });
        
        if (!pendingTokenRef.current) {
          remoteLog.warn('voip', 'token_timeout_no_token', {
            message: 'Token did not arrive within timeout! This indicates iOS/APNs issue.',
            possibleCauses: 'Push Notifications capability, VoIP entitlement, Certificate issue, APNs network',
          });
          
          if (retryCount < maxRetries) {
            remoteLog.info('voip', 'token_timeout_retry', { 
              nextAttempt: retryCount + 2 
            });
            hasRegisteredRef.current = false;
            attemptVoIPRegistration(retryCount + 1);
          } else {
            remoteLog.error('voip', 'token_all_retries_exhausted', { 
              totalAttempts: maxRetries + 1,
              finalResult: 'FAILED - No token received from iOS',
            });
          }
        } else {
          remoteLog.info('voip', 'token_timeout_success', {
            message: 'Token was received within timeout!',
            tokenLength: pendingTokenRef.current.length,
            tokenPreview: pendingTokenRef.current.substring(0, 20) + '...',
          });
        }
      }, TOKEN_TIMEOUT_MS);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[CallKit] Registration attempt failed:', error);
      
      remoteLog.error('voip', 'registration_attempt_failed', { 
        attempt: retryCount + 1, 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`[CallKit] Retrying in ${delay}ms...`);
        remoteLog.info('voip', 'registration_retry_scheduled', { 
          delayMs: delay, 
          nextAttempt: retryCount + 2 
        });
        setTimeout(() => attemptVoIPRegistration(retryCount + 1), delay);
      } else {
        console.error('[CallKit] All registration attempts failed');
        remoteLog.error('voip', 'registration_all_attempts_failed', { 
          totalAttempts: maxRetries + 1 
        });
      }
    }
  }, []);

  // Initialize CallKit plugin on iOS
  useEffect(() => {
    const initCallKit = async () => {
      console.log('[CallKit] ====== INIT CHECK ======');
      console.log('[CallKit] Platform:', Capacitor.getPlatform());
      console.log('[CallKit] Is native platform:', Capacitor.isNativePlatform());
      console.log('[CallKit] isIOSNative():', isIOSNative());
      
      remoteLog.info('voip', 'callkit_init_check', {
        platform: Capacitor.getPlatform(),
        isNative: Capacitor.isNativePlatform(),
        isIOSNative: isIOSNative(),
      });
      
      if (!isIOSNative()) {
        console.log('[CallKit] Not on iOS native, skipping initialization');
        return;
      }

      if (hasInitializedRef.current) {
        console.log('[CallKit] Already initialized, skipping');
        remoteLog.info('voip', 'callkit_already_initialized');
        return;
      }

      try {
        console.log('[CallKit] ====== STARTING CALLKIT INIT ON iOS ======');
        remoteLog.info('voip', 'callkit_init_start');
        
        // Initialize device_id early
        deviceIdRef.current = await getOrCreateDeviceId();
        console.log('[CallKit] Device ID initialized:', deviceIdRef.current.substring(0, 8) + '...');
        
        const { CallKitVoip } = await import('capacitor-plugin-callkit-voip');
        
        if (callKitPluginRef.current) {
          console.log('[CallKit] Removing previous listeners before init');
          try {
            await callKitPluginRef.current.removeAllListeners?.();
          } catch (e) {
            console.log('[CallKit] Error removing previous listeners:', e);
          }
        }
        
        callKitPluginRef.current = CallKitVoip;
        hasInitializedRef.current = true;
        
        console.log('[CallKit] Plugin imported successfully');
        remoteLog.info('voip', 'callkit_plugin_loaded', {
          methods: Object.keys(CallKitVoip || {}).join(','),
        });
        
        // Debug listener
        console.log('[CallKit] Setting up DEBUG listener...');
        (CallKitVoip as any).addListener('debug', (data: any) => {
          console.log('[CallKit DEBUG]', data.stage, JSON.stringify(data, null, 2));
          
          if (data.stage === 'push_received') {
            toast({
              title: `📥 Push: ${data.payload_name}`,
              description: `ID: ${data.payload_id}`,
              duration: 5000,
            });
          }
        });
        
        // Registration listener - ✅ IMMEDIATELY save token when received
        console.log('[CallKit] Setting up registration listener...');
        remoteLog.info('voip', 'setting_up_registration_listener');
        
        (CallKitVoip as any).addListener('registration', async (data: { value: string }) => {
          const receivedAt = new Date().toISOString();
          console.log('[CallKit] ====== VOIP TOKEN RECEIVED FROM iOS ======');
          console.log('[CallKit] Token (data.value) exists:', !!data?.value);
          console.log('[CallKit] Token length:', data?.value?.length);
          
          remoteLog.info('voip', 'TOKEN_RECEIVED_FROM_IOS', {
            receivedAt,
            hasValue: !!data?.value,
            tokenLength: data?.value?.length,
            tokenPreview: data?.value?.substring(0, 20) + '...',
          });
          
          if (data?.value) {
            // ✅ CRITICAL: Store in memory AND save to DB immediately
            pendingTokenRef.current = data.value;
            
            remoteLog.info('voip', 'token_stored_in_pending_ref', { 
              tokenLength: data.value.length 
            });
            
            // Save to devices table (works even without login!)
            const saved = await saveVoIPToken(data.value);
            console.log('[CallKit] Token save result:', saved ? 'SUCCESS' : 'SAVED (may not have user yet)');
            
            remoteLog.info('voip', 'token_save_to_db_result', { 
              success: saved,
              pendingTokenStored: !!pendingTokenRef.current,
            });
          } else {
            console.error('[CallKit] No value in registration data!');
            remoteLog.error('voip', 'TOKEN_MISSING_IN_CALLBACK_DATA', { 
              dataKeys: Object.keys(data || {}).join(','),
            });
          }
        });
        
        remoteLog.info('voip', 'registration_listener_ready');
        
        // Register for VoIP notifications
        console.log('[CallKit] Calling attemptVoIPRegistration()...');
        await attemptVoIPRegistration();
        
// Call answered listener - CRITICAL for TTS on native screen
        console.log('[CallKit] Setting up callAnswered listener...');
        remoteLog.info('voip', 'setting_up_call_answered_listener', {
          timestamp: new Date().toISOString(),
        });
        
        CallKitVoip.addListener('callAnswered', async (data: any) => {
          const receivedAt = new Date().toISOString();
          console.log('[CallKit] ====== CALL ANSWERED EVENT RECEIVED ======');
          console.log('[CallKit] Received at:', receivedAt);
          console.log('[CallKit] Full data:', JSON.stringify(data, null, 2));
          
          remoteLog.info('voip', 'call_answered_received', {
            receivedAt,
            eventId: data?.eventId || data?.id,
            eventTitle: data?.eventTitle || data?.name,
            connectionId: data?.connectionId,
            preloadedTTSAvailable: !!preloadedTTSRef.current,
            preloadingInProgress: !!preloadingTTSRef.current,
            hasCurrentEvent: !!currentEventRef.current,
            rawDataKeys: Object.keys(data || {}).join(','),
          });
          
          // Step 1: Configure audio session for TTS playback during active call
          console.log('[CallKit] Step 1: Configuring audio session...');
          try {
            if ((CallKitVoip as any).configureAudioSession) {
              const audioResult = await (CallKitVoip as any).configureAudioSession();
              console.log('[CallKit] Audio session result:', audioResult);
              remoteLog.info('voip', 'audio_session_configured', { result: audioResult });
            } else {
              console.log('[CallKit] configureAudioSession not available');
              remoteLog.warn('voip', 'configure_audio_session_not_available');
            }
          } catch (e) {
            console.log('[CallKit] configureAudioSession error:', e);
            remoteLog.error('voip', 'configure_audio_session_error', { 
              error: e instanceof Error ? e.message : String(e) 
            });
          }
          
          // Step 2: Determine which event to play TTS for
          console.log('[CallKit] Step 2: Determining event to play...');
          let eventToPlay: CallKitEvent | null = null;
          
          if (data?.eventId || data?.eventTitle || data?.name || data?.id) {
            const eventTime = data.eventTime || data.time || data.duration || '';
            eventToPlay = {
              id: data.eventId || data.id || data.connectionId || 'call-event',
              title: data.eventTitle || data.name || 'Evento',
              emoji: data.eventEmoji || '📅',
              time: eventTime,
              location: data.eventLocation || data.location || '',
            };
            console.log('[CallKit] Event from payload:', eventToPlay);
            setCurrentEvent(eventToPlay);
          } else {
            eventToPlay = currentEventRef.current;
            console.log('[CallKit] Using currentEventRef:', eventToPlay);
          }
          
          remoteLog.info('voip', 'call_answered_event_resolved', {
            eventId: eventToPlay?.id,
            eventTitle: eventToPlay?.title,
            source: (data?.eventId || data?.name) ? 'payload' : 'currentEventRef',
          });
          
          if (eventToPlay) {
            // Step 3: Save call answered to database
            console.log('[CallKit] Step 3: Saving call answered to database...');
            if (eventToPlay.id && eventToPlay.id !== 'call-event') {
              try {
                await supabase
                  .from('events')
                  .update({ 
                    call_alert_answered: true,
                    call_alert_answered_at: new Date().toISOString(),
                    call_alert_outcome: 'answered'
                  })
                  .eq('id', eventToPlay.id);
                console.log('[CallKit] Database updated successfully');
                remoteLog.info('voip', 'call_answered_db_saved', { eventId: eventToPlay.id });
              } catch (e) {
                console.error('[CallKit] Error saving call answered:', e);
                remoteLog.error('voip', 'call_answered_db_error', { 
                  error: e instanceof Error ? e.message : String(e) 
                });
              }
            }
            
            // Step 4: Small delay to ensure audio session is ready
            console.log('[CallKit] Step 4: Waiting 500ms for audio session...');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Step 5: Play TTS on native screen
            console.log('[CallKit] Step 5: Playing TTS on native screen...');
            remoteLog.info('voip', 'call_answered_playing_tts', { 
              eventId: eventToPlay.id,
              eventTitle: eventToPlay.title,
            });
            
            await playTTS(eventToPlay);
            
            console.log('[CallKit] ====== TTS PLAYBACK INITIATED ======');
          } else {
            console.log('[CallKit] ⚠️ No event to play TTS for!');
            remoteLog.warn('voip', 'call_answered_no_event', {
              hasCurrentEventRef: !!currentEventRef.current,
              payloadKeys: Object.keys(data || {}).join(','),
            });
          }
        });
        
        // Call started listener - TRIGGERED BY VOIP PUSH (before user answers!)
        // This is the PERFECT time to pre-load TTS
        console.log('[CallKit] Setting up callStarted listener...');
        CallKitVoip.addListener('callStarted', async (data: any) => {
          const receivedAt = new Date().toISOString();
          console.log('[CallKit] ====== CALL STARTED (VoIP Push Received) ======');
          console.log('[CallKit] Received at:', receivedAt);
          console.log('[CallKit] Data:', JSON.stringify(data));
          
          remoteLog.info('voip', 'call_started_voip_push', {
            receivedAt,
            eventId: data?.eventId,
            eventTitle: data?.eventTitle,
            eventTime: data?.eventTime,
          });
          
          // Cleanup previous call state
          isCallingTTSRef.current = false;
          preloadedTTSRef.current = null;
          preloadingTTSRef.current = null;
          
          if (audioRef.current) {
            try {
              audioRef.current.pause();
              audioRef.current.src = '';
              audioRef.current.load();
            } catch (e) {}
            audioRef.current = null;
          }
          
          if (callKitPluginRef.current?.stopTTSAudio) {
            try {
              await callKitPluginRef.current.stopTTSAudio();
            } catch (e) {}
          }
          
          if (safetyTimeoutRef.current) {
            clearTimeout(safetyTimeoutRef.current);
            safetyTimeoutRef.current = null;
          }
          
          // Safety timeout (longer now since we have silence anchor)
          safetyTimeoutRef.current = window.setTimeout(() => {
            console.log('[CallKit] ⚠️ SAFETY TIMEOUT - forcing cleanup after 90s');
            forceCleanupAllState();
            
            if (callKitPluginRef.current && currentEventRef.current) {
              const endCallFn = callKitPluginRef.current.endCallFromJS || callKitPluginRef.current.endCall;
              endCallFn?.({ id: currentEventRef.current.id }).catch(() => {});
            }
          }, 90000); // Increased to 90s since we have silence anchor
          
          // Extract event data from payload
          const eventId = data?.eventId || data?.id;
          const eventTitle = data?.eventTitle || data?.name || 'Evento';
          const eventTime = data?.eventTime || data?.duration || '';
          
          if (eventId || eventTitle) {
            const eventData = {
              id: eventId || 'call-event',
              title: eventTitle,
              emoji: data?.eventEmoji || '📅',
              time: eventTime,
              location: data?.eventLocation || '',
            };
            setCurrentEvent(eventData);
            currentEventRef.current = eventData;
            
            // ✅ CRITICAL: Pre-load TTS IMMEDIATELY when call arrives
            // User hasn't answered yet, so we have time to load TTS
            console.log('[CallKit] 🚀🚀🚀 PRE-LOADING TTS IMMEDIATELY (before user answers!)');
            console.log('[CallKit] Event:', eventData.title, 'Time:', eventData.time);
            
            const language = currentLanguageRef.current;
            const preloadStartTime = Date.now();
            
            remoteLog.info('voip', 'tts_preload_start_immediate', { 
              eventId: eventData.id,
              eventTitle: eventData.title,
              eventTime: eventData.time,
              language,
              startTime: preloadStartTime,
            });
            
            // Start pre-loading TTS in background
            preloadingTTSRef.current = (async () => {
              try {
                console.log('[CallKit] 📥 Calling text-to-speech edge function...');
                
                const { data: ttsData, error } = await supabase.functions.invoke('text-to-speech', {
                  body: { 
                    titulo: eventData.title,
                    hora: eventData.time || '',
                    language: language,
                  }
                });
                
                const loadTime = Date.now() - preloadStartTime;
                
                if (error) {
                  console.error('[CallKit] ❌ Pre-load TTS error:', error);
                  remoteLog.error('voip', 'tts_preload_error', { 
                    error: error.message,
                    loadTimeMs: loadTime,
                  });
                  return null;
                }
                
                if (ttsData?.audioContent) {
                  console.log(`[CallKit] ✅✅✅ TTS PRE-LOADED in ${loadTime}ms! (${ttsData.audioContent.length} bytes)`);
                  preloadedTTSRef.current = ttsData.audioContent;
                  
                  remoteLog.info('voip', 'tts_preload_success', { 
                    loadTimeMs: loadTime,
                    audioLength: ttsData.audioContent.length,
                    eventId: eventData.id,
                  });
                  
                  return ttsData.audioContent;
                }
                
                console.log('[CallKit] ⚠️ TTS response has no audioContent');
                remoteLog.warn('voip', 'tts_preload_no_content', { loadTimeMs: loadTime });
                return null;
              } catch (e) {
                const loadTime = Date.now() - preloadStartTime;
                console.error('[CallKit] ❌ Pre-load TTS exception:', e);
                remoteLog.error('voip', 'tts_preload_exception', { 
                  error: e instanceof Error ? e.message : String(e),
                  loadTimeMs: loadTime,
                });
                return null;
              }
            })();
          } else {
            console.log('[CallKit] ⚠️ No event data in callStarted payload');
            remoteLog.warn('voip', 'call_started_no_event_data', {
              dataKeys: Object.keys(data || {}).join(','),
            });
          }
        });
        
        // Call ended listener
        console.log('[CallKit] Setting up callEnded listener...');
        CallKitVoip.addListener('callEnded', async (data: any) => {
          console.log('[CallKit] ====== CALL ENDED ======');
          
          remoteLog.info('voip', 'call_ended', { eventId: data?.eventId });
          
          if (safetyTimeoutRef.current) {
            clearTimeout(safetyTimeoutRef.current);
            safetyTimeoutRef.current = null;
          }
          
          const wasAnswered = isCallingTTSRef.current;
          isCallingTTSRef.current = false;
          
          if (callKitPluginRef.current?.stopTTSAudio) {
            try {
              await callKitPluginRef.current.stopTTSAudio();
            } catch (e) {}
          }
          
          if (audioRef.current) {
            try {
              audioRef.current.pause();
              audioRef.current.src = '';
              audioRef.current.load();
            } catch (e) {}
            audioRef.current = null;
          }
          
          // Mark as missed if not answered
          const eventId = data?.eventId || currentEventRef.current?.id;
          if (eventId && eventId !== 'call-event' && !wasAnswered) {
            try {
              const { data: eventData } = await supabase
                .from('events')
                .select('call_alert_outcome')
                .eq('id', eventId)
                .maybeSingle();
              
              if (eventData?.call_alert_outcome !== 'answered') {
                await supabase
                  .from('events')
                  .update({ call_alert_outcome: 'missed' })
                  .eq('id', eventId);
              }
            } catch (e) {}
          }
          
          forceCleanupAllState();
        });
        
        console.log('[CallKit] ====== CALLKIT INIT COMPLETE ======');
        
      } catch (error) {
        console.error('[CallKit] ====== INIT FAILED ======', error);
      }
    };

    initCallKit();

    return () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      
      if (callKitPluginRef.current) {
        callKitPluginRef.current.removeAllListeners?.();
      }
      
      hasInitializedRef.current = false;
    };
  }, [saveVoIPToken, attemptVoIPRegistration, forceCleanupAllState, toast]);

  // ✅ CRITICAL: Listen for logout reset event from AuthContext
  // This allows AuthContext to trigger VoIP reset without circular dependencies
  useEffect(() => {
    const handleResetVoIP = async () => {
      console.log('[CallKit] Received reset-voip event from Auth');
      
      // We need to define resetVoIPState inline since it's not available yet
      // Force cleanup any active calls
      forceCleanupAllState();
      
      // Remove ALL plugin listeners (if plugin supports it)
      if (callKitPluginRef.current) {
        try {
          console.log('[CallKit] Removing all plugin listeners via event...');
          await callKitPluginRef.current.removeAllListeners?.();
        } catch (e) {
          console.log('[CallKit] Error removing listeners:', e);
        }
      }
      
      // Reset ALL refs to initial state
      callKitPluginRef.current = null;
      hasRegisteredRef.current = false;
      hasInitializedRef.current = false;
      pendingTokenRef.current = null;
      preloadedTTSRef.current = null;
      preloadingTTSRef.current = null;
      currentEventRef.current = null;
      isCallingTTSRef.current = false;
      
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      
      console.log('[CallKit] VoIP state reset via event complete');
      remoteLog.info('voip', 'reset_via_event_complete');
    };
    
    window.addEventListener('horah:reset-voip', handleResetVoIP);
    
    return () => {
      window.removeEventListener('horah:reset-voip', handleResetVoIP);
    };
  }, [forceCleanupAllState]);

  // ✅ CRITICAL: Listen for auth state changes to FORCE ASSOCIATE device with current user
  // ✅ FIX: ALWAYS reuse existing token from DB instead of trying to get new one from iOS
  useEffect(() => {
    if (!isIOSNative()) return;

    const forceAssociateDeviceWithUser = async (userId: string, eventType: string) => {
      console.log('[CallKit] ====== FORCE ASSOCIATING DEVICE WITH USER ======');
      console.log('[CallKit] Event:', eventType);
      console.log('[CallKit] User ID:', userId.substring(0, 8));
      
      remoteLog.info('voip', 'force_associate_device_start_v5', {
        event: eventType,
        userId: userId.substring(0, 8) + '...',
        hasPendingToken: !!pendingTokenRef.current,
        hasDeviceId: !!deviceIdRef.current,
      });
      
      try {
        // Get NATIVE device_id (IDFV on iOS)
        const deviceId = deviceIdRef.current || await getOrCreateDeviceId();
        deviceIdRef.current = deviceId;
        
        console.log('[CallKit] Native Device ID (IDFV):', deviceId.substring(0, 8) + '...');
        
        // ✅ STEP 1: Call claim-device Edge Function (bypasses RLS via SERVICE_ROLE)
        // This is the RELIABLE way to associate device with user regardless of RLS
        console.log('[CallKit] 🔄 Calling claim-device Edge Function...');
        
        const { data: claimResult, error: claimError } = await supabase.functions.invoke('claim-device', {
          body: { device_id: deviceId }
        });
        
        if (claimError) {
          console.error('[CallKit] ❌ claim-device failed:', claimError);
          remoteLog.error('voip', 'claim_device_failed_v5', { 
            error: claimError.message,
            deviceId: deviceId.substring(0, 8),
          });
          
          // 🔴 Toast de erro - vermelho
          toast({
            title: "❌ Erro ao vincular dispositivo",
            description: claimError.message || "Falha ao atualizar user_id no banco",
            variant: "destructive",
            duration: 6000,
          });
        } else {
          console.log('[CallKit] ✅ claim-device result:', claimResult);
          remoteLog.info('voip', 'claim_device_success_v5', {
            deviceId: deviceId.substring(0, 8),
            result: claimResult,
          });
          
          // 🟢 Toast de sucesso - verde
          if (claimResult?.claimed) {
            toast({
              title: "✅ Dispositivo vinculado!",
              description: `user_id atualizado para ${userId.substring(0, 8)}...`,
              duration: 5000,
            });
          } else if (claimResult?.already_owned) {
            toast({
              title: "ℹ️ Dispositivo já vinculado",
              description: `Já pertence a ${userId.substring(0, 8)}...`,
              duration: 4000,
            });
          }
          
          // If device was claimed and has token, we're done
          if (claimResult?.claimed && claimResult?.has_token) {
            console.log('[CallKit] ✅ Device claimed with token! VoIP ready.');
            return;
          }
        }
        
        // ✅ STEP 2: Also check locally if we have token for immediate use
        const { data: existingDevice } = await supabase
          .from('devices')
          .select('user_id, voip_token, device_id')
          .eq('device_id', deviceId)
          .maybeSingle();
        
        const hasExistingToken = !!(existingDevice?.voip_token);
        
        console.log('[CallKit] Local DB check:', {
          hasExistingToken,
          tokenLength: existingDevice?.voip_token?.length || 0,
        });
        
        if (hasExistingToken) {
          // Store token in memory for immediate use
          pendingTokenRef.current = existingDevice.voip_token;
          console.log('[CallKit] ✅ Token loaded to memory');
          return;
        }
        
        // ✅ STEP 3: No token in local DB. Check if we have one in memory.
        if (pendingTokenRef.current) {
          console.log('[CallKit] Token in memory, saving to DB via claim-device already handled...');
          return;
        }
        
        // ✅ STEP 4: No token for this device_id! Force iOS to re-send the token
        // This will trigger the 'registration' listener, which calls saveVoIPToken
        // saveVoIPToken will detect if the token exists with an OLD device_id and migrate it
        console.log('[CallKit] ⚠️ No token for native IDFV. Forcing iOS to re-send token...');
        remoteLog.warn('voip', 'no_token_forcing_register_v5', {
          deviceId: deviceId.substring(0, 8),
          userId: userId.substring(0, 8),
          reason: 'Token exists with old JS-UUID, need iOS to resend so saveVoIPToken can migrate',
        });
        
        // Force a fresh registration - iOS will ALWAYS return the current token
        hasRegisteredRef.current = false;
        if (callKitPluginRef.current) {
          console.log('[CallKit] Calling register() to trigger token callback...');
          await callKitPluginRef.current.register();
          console.log('[CallKit] register() completed - token callback should fire');
        } else {
          console.log('[CallKit] Plugin not loaded, using attemptVoIPRegistration...');
          await attemptVoIPRegistration();
        }
        
      } catch (error) {
        console.error('[CallKit] Error in forceAssociateDeviceWithUser:', error);
        remoteLog.error('voip', 'force_associate_exception_v3', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[CallKit] Auth state changed:', event);
      
      remoteLog.info('voip', 'auth_state_changed_v3', {
        event,
        hasSession: !!session,
        userId: session?.user?.id?.substring(0, 8) || 'none',
      });
      
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user?.id) {
        // Use setTimeout to avoid Supabase auth deadlock
        setTimeout(() => {
          forceAssociateDeviceWithUser(session.user.id, event);
        }, 0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [attemptVoIPRegistration]);

  // Manual registration function
  const registerVoIPToken = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    console.log('[CallKit] ====== MANUAL REGISTRATION REQUESTED ======');
    
    remoteLog.info('voip', 'manual_registration_requested');
    
    if (!isIOSNative()) {
      console.log('[CallKit] Not on iOS native');
      return { success: false, message: 'Disponível apenas no iOS' };
    }
    
    if (!callKitPluginRef.current) {
      try {
        const { CallKitVoip } = await import('capacitor-plugin-callkit-voip');
        callKitPluginRef.current = CallKitVoip;
      } catch (e) {
        return { success: false, message: 'Plugin CallKit não disponível' };
      }
    }
    
    try {
      await callKitPluginRef.current.register();
      return { success: true, message: 'Registro iniciado. Aguardando token do iOS...' };
    } catch (error) {
      return { success: false, message: `Erro: ${(error as Error).message}` };
    }
  }, []);

  // Cleanup call state
  const cleanupCall = useCallback(() => {
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
    
    preloadedTTSRef.current = null;
    preloadingTTSRef.current = null;
    
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
      } catch (e) {}
      audioRef.current = null;
    }
    
    isCallingTTSRef.current = false;
    setIsPlaying(false);
    setIsCallVisible(false);
    setCurrentEvent(null);
  }, []);

// Play TTS - MODIFIED for native screen playback
  const playTTS = useCallback(async (event: CallKitEvent) => {
    console.log('[CallKit] ====== PLAY TTS CALLED ======');
    console.log('[CallKit] Event:', JSON.stringify(event));
    
    if (isCallingTTSRef.current) {
      console.log('[CallKit] ⚠️ TTS already in progress, skipping');
      remoteLog.warn('voip', 'tts_already_in_progress', { eventId: event.id });
      return;
    }
    
    remoteLog.info('voip', 'tts_play_started', { 
      eventId: event.id,
      eventTitle: event.title,
      preloadedTTSAvailable: !!preloadedTTSRef.current,
      preloadingInProgress: !!preloadingTTSRef.current,
      isIOSNative: isIOSNative(),
    });
    
    isCallingTTSRef.current = true;
    setIsPlaying(true);
    
    const MAX_CALL_DURATION = 25000; // 25 seconds max
    let callTimeoutId: NodeJS.Timeout | null = null;
    
    const endCallAndCleanup = async () => {
      console.log('[CallKit] 🔚 endCallAndCleanup called');
      
      if (callTimeoutId) {
        clearTimeout(callTimeoutId);
        callTimeoutId = null;
      }
      
      // Stop native audio if playing
      if (isIOSNative() && callKitPluginRef.current?.stopTTSAudio) {
        try {
          console.log('[CallKit] Stopping native TTS audio...');
          await callKitPluginRef.current.stopTTSAudio();
        } catch (e) {
          console.log('[CallKit] Error stopping native TTS:', e);
        }
      }
      
      // Stop web audio if playing
      if (audioRef.current) {
        console.log('[CallKit] Stopping web audio...');
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      setIsPlaying(false);
      isCallingTTSRef.current = false;
      
      // ✅ CRITICAL: Call endCallFromJS to end the native call screen
      if (isIOSNative() && callKitPluginRef.current) {
        console.log('[CallKit] 📱 Calling endCallFromJS to end native call...');
        
        // Try endCallFromJS first (our modified plugin)
        const endCallFn = callKitPluginRef.current.endCallFromJS || callKitPluginRef.current.endCall;
        
        if (endCallFn) {
          try {
            const endResult = await endCallFn({ id: currentEventRef.current?.id || event.id });
            console.log('[CallKit] endCallFromJS result:', endResult);
            remoteLog.info('voip', 'end_call_from_js_result', { result: endResult });
          } catch (e) {
            console.error('[CallKit] Error calling endCallFromJS:', e);
            remoteLog.error('voip', 'end_call_from_js_error', { 
              error: e instanceof Error ? e.message : String(e) 
            });
          }
        } else {
          console.log('[CallKit] ⚠️ No endCall function available');
          remoteLog.warn('voip', 'no_end_call_function');
        }
      }
      
      // Cleanup after a short delay
      setTimeout(cleanupCall, 500);
    };
    
    try {
      const language = currentLanguageRef.current;
      console.log('[CallKit] Language:', language);
      
      // Step 1: Get TTS audio (pre-loaded or fetch new)
      let base64Audio: string | null = preloadedTTSRef.current;
      
      if (base64Audio) {
        console.log('[CallKit] ✅ Using PRE-LOADED TTS audio (length:', base64Audio.length, ')');
        remoteLog.info('voip', 'tts_using_preloaded', { audioLength: base64Audio.length });
      } else if (preloadingTTSRef.current) {
        console.log('[CallKit] ⏳ Waiting for pre-loading TTS to complete...');
        remoteLog.info('voip', 'tts_waiting_preload');
        base64Audio = await preloadingTTSRef.current;
        console.log('[CallKit] Pre-load completed:', base64Audio ? `${base64Audio.length} bytes` : 'null');
      }
      
      if (!base64Audio) {
        console.log('[CallKit] 📥 Fetching TTS from edge function...');
        remoteLog.info('voip', 'tts_fetching_new', { 
          titulo: event.title,
          hora: event.time,
          language,
        });
        
        const { data, error } = await supabase.functions.invoke('text-to-speech', {
          body: { 
            titulo: event.title,
            hora: event.time || '',
            language: language,
          }
        });

        if (error) {
          console.error('[CallKit] TTS fetch error:', error);
          remoteLog.error('voip', 'tts_fetch_error', { error: error.message });
          throw error;
        }
        
        base64Audio = data?.audioContent || null;
        console.log('[CallKit] TTS fetched:', base64Audio ? `${base64Audio.length} bytes` : 'null');
      }

      if (base64Audio) {
        console.log('[CallKit] 🎵 Starting TTS playback...');
        
        // Set max duration timeout
        callTimeoutId = setTimeout(() => {
          console.log('[CallKit] ⏰ Max call duration reached (25s), ending call');
          remoteLog.info('voip', 'tts_max_duration_reached');
          endCallAndCleanup();
        }, MAX_CALL_DURATION);
        
        // Step 2: Try native audio playback first (for native call screen)
        if (isIOSNative() && callKitPluginRef.current?.playTTSAudio) {
          console.log('[CallKit] 📱 Attempting native TTS playback...');
          remoteLog.info('voip', 'tts_native_attempt_start');
          
          let retries = 0;
          const maxRetries = 2;
          
          const tryNativePlayback = async (): Promise<boolean> => {
            try {
              console.log(`[CallKit] Native playback attempt ${retries + 1}/${maxRetries + 1}`);
              
              const result = await callKitPluginRef.current.playTTSAudio({ audio: base64Audio });
              console.log('[CallKit] Native playback result:', result);
              
              if (result?.playing) {
                console.log('[CallKit] ✅ Native TTS playback started!');
                remoteLog.info('voip', 'tts_native_success', { attempt: retries + 1 });
                
                // Wait for audio to finish (estimate based on audio length)
                // Base64 audio for a ~5 second clip is about 50-100KB
                const estimatedDuration = Math.max(5000, Math.min(15000, base64Audio.length / 10));
                console.log(`[CallKit] Waiting ${estimatedDuration}ms for TTS to finish...`);
                
                await new Promise(resolve => setTimeout(resolve, estimatedDuration));
                
                // End call after TTS finishes
                console.log('[CallKit] TTS finished, ending call...');
                await endCallAndCleanup();
                
                return true;
              }
              
              if (result?.error) {
                console.log('[CallKit] Native playback error:', result.error);
              }
              
              if (retries < maxRetries) {
                retries++;
                console.log('[CallKit] Retrying native playback in 500ms...');
                await new Promise(r => setTimeout(r, 500));
                return tryNativePlayback();
              }
              
              return false;
            } catch (e) {
              console.error('[CallKit] Native playback exception:', e);
              remoteLog.error('voip', 'tts_native_exception', { 
                attempt: retries + 1,
                error: e instanceof Error ? e.message : String(e),
              });
              
              if (retries < maxRetries) {
                retries++;
                await new Promise(r => setTimeout(r, 500));
                return tryNativePlayback();
              }
              return false;
            }
          };
          
          const playbackStarted = await tryNativePlayback();
          if (playbackStarted) {
            console.log('[CallKit] Native playback completed successfully');
            return;
          }
          
          console.log('[CallKit] Native playback failed, falling back to web audio...');
          remoteLog.warn('voip', 'tts_native_failed_fallback_web');
        }
        
        // Step 3: Web audio fallback
        console.log('[CallKit] 🌐 Using web audio fallback...');
        remoteLog.info('voip', 'tts_web_fallback_started');
        
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const audioBlob = new Blob([bytes], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        let playCount = 0;
        const maxPlays = 3;
        
        const playAudioLoop = () => {
          if (!isCallingTTSRef.current || !audioUrl) {
            console.log('[CallKit] Audio loop stopped (not calling TTS or no URL)');
            return;
          }
          
          playCount++;
          console.log(`[CallKit] Web audio play ${playCount}/${maxPlays}`);
          
          audioRef.current = new Audio(audioUrl);
          
          audioRef.current.onended = () => {
            console.log('[CallKit] Web audio ended');
            if (isCallingTTSRef.current && playCount < maxPlays) {
              setTimeout(() => {
                if (isCallingTTSRef.current) playAudioLoop();
              }, 800);
            } else {
              // All plays done, end call
              console.log('[CallKit] All web audio plays completed, ending call');
              URL.revokeObjectURL(audioUrl);
              endCallAndCleanup();
            }
          };
          
          audioRef.current.onerror = (e) => {
            console.error('[CallKit] Web audio error:', e);
            URL.revokeObjectURL(audioUrl);
            endCallAndCleanup();
          };
          
          audioRef.current.play().catch((e) => {
            console.error('[CallKit] Web audio play error:', e);
          });
        };
        
        playAudioLoop();
      } else {
        console.log('[CallKit] ⚠️ No TTS audio available!');
        remoteLog.error('voip', 'tts_no_audio_available');
        
        // Still end the call after a delay
        setTimeout(endCallAndCleanup, 2000);
      }
    } catch (error) {
      console.error('[CallKit] ❌ Failed to play TTS:', error);
      remoteLog.error('voip', 'tts_play_exception', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      setIsPlaying(false);
      isCallingTTSRef.current = false;
      
      // End call on error
      setTimeout(endCallAndCleanup, 1000);
    }
  }, [cleanupCall]);

  const showCall = useCallback((event: CallKitEvent, language: string = 'pt-BR') => {
    currentLanguageRef.current = language;
    setCurrentEvent(event);
    
    if (isIOSNative() && callKitPluginRef.current) {
      console.log('[CallKit] showCall called - on iOS this should come via VoIP push');
      setIsCallVisible(true);
    } else {
      setIsCallVisible(true);
    }
  }, []);

  const handleAnswer = useCallback(() => {
    if (isCallingTTSRef.current) return;
    if (currentEventRef.current) {
      playTTS(currentEventRef.current);
    }
  }, [playTTS]);

  const handleDecline = useCallback(() => {
    if (callKitPluginRef.current && currentEventRef.current) {
      const endCallFn = callKitPluginRef.current.endCallFromJS || callKitPluginRef.current.endCall;
      endCallFn?.({ id: currentEventRef.current.id });
    }
    cleanupCall();
  }, [cleanupCall]);

  const handleSnooze = useCallback(() => {
    const event = currentEventRef.current;
    const language = currentLanguageRef.current;
    
    if (callKitPluginRef.current && event) {
      const endCallFn = callKitPluginRef.current.endCallFromJS || callKitPluginRef.current.endCall;
      endCallFn?.({ id: event.id });
    }
    
    cleanupCall();
    
    if (event) {
      setTimeout(() => {
        showCall(event, language);
      }, 10 * 60 * 1000);
    }
  }, [cleanupCall, showCall]);

  // ✅ CRITICAL: Reset ALL VoIP state on logout
  // This is essential for account switching to work on iOS
  // Without this, PKPushRegistry/CXProvider state from first account persists
  const resetVoIPState = useCallback(async () => {
    console.log('[CallKit] ====== RESETTING VOIP STATE FOR LOGOUT ======');
    
    remoteLog.info('voip', 'reset_voip_state_start', {
      hasPlugin: !!callKitPluginRef.current,
      hasRegistered: hasRegisteredRef.current,
      hasInitialized: hasInitializedRef.current,
      hasPendingToken: !!pendingTokenRef.current,
    });
    
    // Step 1: Force cleanup any active calls
    forceCleanupAllState();
    
    // Step 2: Remove ALL plugin listeners (if plugin supports it)
    if (callKitPluginRef.current) {
      try {
        console.log('[CallKit] Removing all plugin listeners...');
        await callKitPluginRef.current.removeAllListeners?.();
        console.log('[CallKit] ✅ All listeners removed');
      } catch (e) {
        console.log('[CallKit] Error removing listeners:', e);
      }
    }
    
    // Step 3: Reset ALL refs to initial state
    console.log('[CallKit] Resetting all refs to initial state...');
    callKitPluginRef.current = null;
    hasRegisteredRef.current = false;
    hasInitializedRef.current = false;
    pendingTokenRef.current = null;
    preloadedTTSRef.current = null;
    preloadingTTSRef.current = null;
    currentEventRef.current = null;
    isCallingTTSRef.current = false;
    // NOTE: deviceIdRef stays - device_id is permanent per device
    
    // Step 4: Clear safety timeout
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
    
    console.log('[CallKit] ====== VOIP STATE RESET COMPLETE ======');
    console.log('[CallKit] Next login will trigger fresh initialization');
    
    remoteLog.info('voip', 'reset_voip_state_complete', {
      note: 'Plugin, listeners, and all refs reset. Ready for new account.',
    });
    
  }, [forceCleanupAllState]);

  return {
    isCallVisible,
    currentEvent,
    showCall,
    handleAnswer,
    handleDecline,
    handleSnooze,
    isPlaying,
    registerVoIPToken,
    resetVoIPState,
  };
};
