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
  const saveVoIPToken = useCallback(async (token: string): Promise<boolean> => {
    console.log('[CallKit] ====== SAVING VOIP TOKEN (DEVICE-BASED) ======');
    console.log('[CallKit] Token to save (first 30 chars):', token?.substring(0, 30));
    
    remoteLog.info('voip', 'token_save_attempt_v2', {
      tokenLength: token?.length,
      tokenPreview: token?.substring(0, 20) + '...',
    });
    
    try {
      // Get or create device_id
      const deviceId = await getOrCreateDeviceId();
      deviceIdRef.current = deviceId;
      console.log('[CallKit] Device ID:', deviceId.substring(0, 8) + '...');
      
      // Get current user (may be null if not logged in)
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;
      console.log('[CallKit] Current user:', userId ? userId.substring(0, 8) + '...' : 'NOT LOGGED IN');
      
      // Store token in memory for immediate use
      pendingTokenRef.current = token;
      
      // UPSERT into devices table - works even without login!
      console.log('[CallKit] Upserting to devices table...');
      const { error, data } = await supabase
        .from('devices')
        .upsert({
          device_id: deviceId,
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
        remoteLog.error('voip', 'token_save_failed_v2', { 
          error: error.message,
          code: error.code,
          deviceId: deviceId.substring(0, 8) + '...',
        });
        return false;
      }
      
      console.log('[CallKit] ====== TOKEN SAVED SUCCESSFULLY (DEVICE-BASED) ======');
      console.log('[CallKit] Saved device record:', JSON.stringify(data));
      remoteLog.info('voip', 'token_saved_success_v2', {
        deviceId: deviceId.substring(0, 8) + '...',
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
      remoteLog.error('voip', 'token_save_exception_v2', { 
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
        
        // Call answered listener
        console.log('[CallKit] Setting up callAnswered listener...');
        CallKitVoip.addListener('callAnswered', async (data: any) => {
          console.log('[CallKit] ====== CALL ANSWERED ======');
          console.log('[CallKit] Answer data:', JSON.stringify(data));
          
          remoteLog.info('voip', 'call_answered', {
            eventId: data?.eventId,
            eventTitle: data?.eventTitle,
            preloadedTTSAvailable: !!preloadedTTSRef.current,
          });
          
          try {
            if ((CallKitVoip as any).configureAudioSession) {
              await (CallKitVoip as any).configureAudioSession();
            }
          } catch (e) {
            console.log('[CallKit] configureAudioSession error:', e);
          }
          
          let eventToPlay: CallKitEvent | null = null;
          
          if (data?.eventId || data?.eventTitle || data?.name) {
            const eventTime = data.eventTime || data.time || '';
            eventToPlay = {
              id: data.eventId || data.id || data.connectionId || 'call-event',
              title: data.eventTitle || data.name || 'Evento',
              emoji: data.eventEmoji || '📅',
              time: eventTime,
              location: data.eventLocation || data.location || '',
            };
            setCurrentEvent(eventToPlay);
          } else {
            eventToPlay = currentEventRef.current;
          }
          
          if (eventToPlay) {
            // Save call answered to database
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
              } catch (e) {
                console.error('[CallKit] Error saving call answered:', e);
              }
            }
            
            await new Promise(resolve => setTimeout(resolve, 300));
            await playTTS(eventToPlay);
          }
        });
        
        // Call started listener
        console.log('[CallKit] Setting up callStarted listener...');
        CallKitVoip.addListener('callStarted', async (data: any) => {
          console.log('[CallKit] ====== CALL STARTED ======');
          
          remoteLog.info('voip', 'call_started', {
            eventId: data?.eventId,
            eventTitle: data?.eventTitle,
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
          
          // Safety timeout
          safetyTimeoutRef.current = window.setTimeout(() => {
            console.log('[CallKit] ⚠️ SAFETY TIMEOUT - forcing cleanup after 60s');
            forceCleanupAllState();
            
            if (callKitPluginRef.current && currentEventRef.current) {
              const endCallFn = callKitPluginRef.current.endCallFromJS || callKitPluginRef.current.endCall;
              endCallFn?.({ id: currentEventRef.current.id }).catch(() => {});
            }
          }, 60000);
          
          if (data.eventId) {
            const eventData = {
              id: data.eventId,
              title: data.eventTitle || data.name || 'Evento',
              emoji: data.eventEmoji || '📅',
              time: data.eventTime,
              location: data.eventLocation,
            };
            setCurrentEvent(eventData);
            
            // Pre-load TTS
            console.log('[CallKit] 🚀 PRE-LOADING TTS while phone rings...');
            const language = currentLanguageRef.current;
            
            preloadingTTSRef.current = (async () => {
              remoteLog.info('voip', 'tts_preload_start', { eventId: eventData.id });
              
              try {
                const { data: ttsData, error } = await supabase.functions.invoke('text-to-speech', {
                  body: { 
                    titulo: eventData.title,
                    hora: eventData.time || '',
                    language: language,
                  }
                });
                
                if (error) {
                  console.error('[CallKit] Pre-load TTS error:', error);
                  return null;
                }
                
                if (ttsData?.audioContent) {
                  console.log('[CallKit] ✅ TTS PRE-LOADED!');
                  preloadedTTSRef.current = ttsData.audioContent;
                  return ttsData.audioContent;
                }
                return null;
              } catch (e) {
                console.error('[CallKit] Pre-load TTS exception:', e);
                return null;
              }
            })();
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

  // ✅ NEW: Listen for auth state changes to ASSOCIATE device with user
  useEffect(() => {
    if (!isIOSNative()) return;

    const associateDeviceWithUser = async (userId: string) => {
      console.log('[CallKit] ====== ASSOCIATING DEVICE WITH USER (NEW LOGIC) ======');
      console.log('[CallKit] User logged in:', userId.substring(0, 8));
      
      remoteLog.info('voip', 'associate_device_with_user', {
        userId: userId.substring(0, 8) + '...',
        hasPendingToken: !!pendingTokenRef.current,
      });
      
      // Get device_id
      const deviceId = deviceIdRef.current || await getOrCreateDeviceId();
      deviceIdRef.current = deviceId;
      
      // If we have a pending token, save it now with the user_id
      if (pendingTokenRef.current) {
        console.log('[CallKit] Saving pending token with user association...');
        await saveVoIPToken(pendingTokenRef.current);
      } else {
        // Just update user_id on existing device record
        console.log('[CallKit] Updating device user_id association...');
        const { data: updateResult, error } = await supabase
          .from('devices')
          .update({ 
            user_id: userId,
            updated_at: new Date().toISOString()
          })
          .eq('device_id', deviceId)
          .select();
        
        if (error) {
          console.log('[CallKit] Update error, triggering registration...');
          remoteLog.warn('voip', 'device_update_error', { error: error.message });
          hasRegisteredRef.current = false;
          await attemptVoIPRegistration();
        } else if (!updateResult || updateResult.length === 0) {
          // ✅ CRITICAL: No rows updated = device_id doesn't exist in table
          // This happens when device_id changed or never registered
          console.log('[CallKit] ⚠️ No device record found for this device_id, forcing re-registration...');
          remoteLog.warn('voip', 'device_not_found_forcing_reregister', {
            deviceId: deviceId.substring(0, 8),
            userId: userId.substring(0, 8),
          });
          hasRegisteredRef.current = false;
          await attemptVoIPRegistration();
        } else {
          console.log('[CallKit] ✅ Device associated with user');
          remoteLog.info('voip', 'device_user_associated', {
            deviceId: deviceId.substring(0, 8),
            userId: userId.substring(0, 8),
          });
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[CallKit] Auth state changed:', event);
      
      remoteLog.info('voip', 'auth_state_changed', {
        event,
        hasSession: !!session,
        userId: session?.user?.id?.substring(0, 8) + '...',
      });
      
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user?.id) {
        await associateDeviceWithUser(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [saveVoIPToken, attemptVoIPRegistration]);

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

  // Play TTS
  const playTTS = useCallback(async (event: CallKitEvent) => {
    if (isCallingTTSRef.current) {
      console.log('[CallKit] TTS already in progress');
      return;
    }
    
    remoteLog.info('voip', 'tts_play_started', { 
      eventId: event.id,
      eventTitle: event.title,
      preloadedTTSAvailable: !!preloadedTTSRef.current,
    });
    
    isCallingTTSRef.current = true;
    setIsPlaying(true);
    
    const MAX_CALL_DURATION = 20000;
    let callTimeoutId: NodeJS.Timeout | null = null;
    
    const endCallAndCleanup = async () => {
      if (callTimeoutId) {
        clearTimeout(callTimeoutId);
        callTimeoutId = null;
      }
      
      if (isIOSNative() && callKitPluginRef.current?.stopTTSAudio) {
        try {
          await callKitPluginRef.current.stopTTSAudio();
        } catch (e) {}
      }
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      setIsPlaying(false);
      isCallingTTSRef.current = false;
      
      if (callKitPluginRef.current && currentEventRef.current) {
        const endCallFn = callKitPluginRef.current.endCallFromJS || callKitPluginRef.current.endCall;
        if (endCallFn) {
          try {
            await endCallFn({ id: currentEventRef.current.id });
          } catch (e) {}
        }
      }
      
      setTimeout(cleanupCall, 500);
    };
    
    try {
      const language = currentLanguageRef.current;
      
      let base64Audio: string | null = preloadedTTSRef.current;
      
      if (base64Audio) {
        console.log('[CallKit] ✅ Using PRE-LOADED TTS audio!');
      } else if (preloadingTTSRef.current) {
        console.log('[CallKit] ⏳ Waiting for pre-loading TTS...');
        base64Audio = await preloadingTTSRef.current;
      }
      
      if (!base64Audio) {
        console.log('[CallKit] 📥 Fetching TTS...');
        const { data, error } = await supabase.functions.invoke('text-to-speech', {
          body: { 
            titulo: event.title,
            hora: event.time || '',
            language: language,
          }
        });

        if (error) throw error;
        base64Audio = data?.audioContent || null;
      }

      if (base64Audio) {
        callTimeoutId = setTimeout(() => {
          console.log('[CallKit] Max call duration reached (20s)');
          endCallAndCleanup();
        }, MAX_CALL_DURATION);
        
        if (isIOSNative() && callKitPluginRef.current?.playTTSAudio) {
          let retries = 0;
          const maxRetries = 2;
          
          const tryNativePlayback = async (): Promise<boolean> => {
            try {
              const result = await callKitPluginRef.current.playTTSAudio({ audio: base64Audio });
              if (result?.playing) {
                remoteLog.info('voip', 'tts_native_success', { attempt: retries + 1 });
                return true;
              }
              if (retries < maxRetries) {
                retries++;
                await new Promise(r => setTimeout(r, 500));
                return tryNativePlayback();
              }
              return false;
            } catch (e) {
              if (retries < maxRetries) {
                retries++;
                await new Promise(r => setTimeout(r, 500));
                return tryNativePlayback();
              }
              return false;
            }
          };
          
          const playbackStarted = await tryNativePlayback();
          if (playbackStarted) return;
        }
        
        // Web audio fallback
        remoteLog.info('voip', 'tts_web_fallback_started');
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const audioBlob = new Blob([bytes], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const playAudioLoop = () => {
          if (!isCallingTTSRef.current || !audioUrl) return;
          
          audioRef.current = new Audio(audioUrl);
          
          audioRef.current.onended = () => {
            if (isCallingTTSRef.current) {
              setTimeout(() => {
                if (isCallingTTSRef.current) playAudioLoop();
              }, 800);
            }
          };
          
          audioRef.current.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            endCallAndCleanup();
          };
          
          audioRef.current.play().catch(() => {});
        };
        
        playAudioLoop();
      }
    } catch (error) {
      console.error('[CallKit] Failed to play TTS:', error);
      setIsPlaying(false);
      isCallingTTSRef.current = false;
      setTimeout(cleanupCall, 3000);
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

  return {
    isCallVisible,
    currentEvent,
    showCall,
    handleAnswer,
    handleDecline,
    handleSnooze,
    isPlaying,
    registerVoIPToken,
  };
};
