import { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const preloadedTTSRef = useRef<string | null>(null); // Pre-loaded TTS audio base64
  const preloadingTTSRef = useRef<Promise<string | null> | null>(null); // TTS loading promise

  // Sync currentEvent to ref
  useEffect(() => {
    currentEventRef.current = currentEvent;
  }, [currentEvent]);

  // Save VoIP token to Supabase - returns success status
  const saveVoIPToken = useCallback(async (token: string): Promise<boolean> => {
    console.log('[CallKit] ====== SAVING VOIP TOKEN ======');
    console.log('[CallKit] Token to save (first 30 chars):', token?.substring(0, 30));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[CallKit] Current user:', user?.id);
      
      if (!user) {
        console.log('[CallKit] No user logged in, storing token for later');
        pendingTokenRef.current = token;
        return false;
      }
      
      console.log('[CallKit] Updating profile with token...');
      const { error, data } = await supabase
        .from('profiles')
        .update({ 
          voip_token: token,
        })
        .eq('id', user.id)
        .select();
      
      if (error) {
        console.error('[CallKit] Failed to save VoIP token:', error);
        console.error('[CallKit] Error details:', JSON.stringify(error));
        return false;
      } else {
        console.log('[CallKit] ====== TOKEN SAVED SUCCESSFULLY ======');
        console.log('[CallKit] Updated profile:', JSON.stringify(data));
        console.log('[CallKit] VoIP token is now active in database!');
        pendingTokenRef.current = null;
        toast({
          title: "Me Ligue ativado",
          description: "Você receberá chamadas nativas para seus lembretes",
          duration: 3000,
        });
        return true;
      }
    } catch (error) {
      console.error('[CallKit] Error saving VoIP token:', error);
      return false;
    }
  }, [toast]);

  // Try to register VoIP with retries
  const attemptVoIPRegistration = useCallback(async (retryCount = 0): Promise<void> => {
    if (!isIOSNative() || hasRegisteredRef.current) {
      return;
    }

    const maxRetries = 3;
    
    try {
      console.log(`[CallKit] Registration attempt ${retryCount + 1}/${maxRetries + 1}`);
      
      if (!callKitPluginRef.current) {
        const { CallKitVoip } = await import('capacitor-plugin-callkit-voip');
        callKitPluginRef.current = CallKitVoip;
      }
      
      await callKitPluginRef.current.register();
      hasRegisteredRef.current = true;
      console.log('[CallKit] Registration successful');
    } catch (error) {
      console.error('[CallKit] Registration attempt failed:', error);
      
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`[CallKit] Retrying in ${delay}ms...`);
        setTimeout(() => attemptVoIPRegistration(retryCount + 1), delay);
      } else {
        console.error('[CallKit] All registration attempts failed');
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
      
      if (!isIOSNative()) {
        console.log('[CallKit] Not on iOS native, skipping initialization');
        console.log('[CallKit] This is expected in browser/web preview');
        return;
      }

      try {
        console.log('[CallKit] ====== STARTING CALLKIT INIT ON iOS ======');
        
        // Dynamic import to avoid errors on non-native platforms
        console.log('[CallKit] Importing capacitor-plugin-callkit-voip...');
        const { CallKitVoip } = await import('capacitor-plugin-callkit-voip');
        callKitPluginRef.current = CallKitVoip;
        
        console.log('[CallKit] Plugin imported successfully');
        console.log('[CallKit] CallKitVoip object:', CallKitVoip);
        console.log('[CallKit] Available methods:', Object.keys(CallKitVoip || {}));
        
        // Listen for DEBUG events from Swift - THIS IS THE KEY FOR DEBUGGING WITHOUT XCODE
        console.log('[CallKit] Setting up DEBUG listener...');
        (CallKitVoip as any).addListener('debug', (data: any) => {
          console.log('[CallKit DEBUG] ====================================');
          console.log('[CallKit DEBUG] Stage:', data.stage);
          console.log('[CallKit DEBUG] Full data:', JSON.stringify(data, null, 2));
          console.log('[CallKit DEBUG] ====================================');
          
          // Show toast with debug info so user can see it on device
          if (data.stage === 'push_received') {
            toast({
              title: `📥 Push: ${data.payload_name}`,
              description: `ID: ${data.payload_id}`,
              duration: 5000,
            });
          } else if (data.stage === 'anchor_start') {
            toast({
              title: `🔇 Silence.caf`,
              description: `Found: ${data.silence_found}, Started: ${data.silence_started}`,
              duration: 5000,
            });
          } else if (data.stage === 'call_reported') {
            toast({
              title: `📞 Call: ${data.displayName}`,
              description: `Handle: ${data.handleValue}, Error: ${data.error}`,
              duration: 5000,
            });
          }
        });
        console.log('[CallKit] DEBUG listener set up');
        
        // Listen for registration token BEFORE registering
        // IMPORTANT: Plugin sends token as "value" not "token"
        console.log('[CallKit] Setting up registration listener...');
        const registrationListener = (CallKitVoip as any).addListener('registration', async (data: { value: string }) => {
          console.log('[CallKit] ====== VOIP TOKEN RECEIVED FROM iOS ======');
          console.log('[CallKit] Raw data:', JSON.stringify(data));
          console.log('[CallKit] Token (data.value) exists:', !!data?.value);
          console.log('[CallKit] Token length:', data?.value?.length);
          console.log('[CallKit] Token preview:', data?.value?.substring(0, 50) + '...');
          
          if (data?.value) {
            const saved = await saveVoIPToken(data.value);
            console.log('[CallKit] Token save result:', saved ? 'SUCCESS' : 'FAILED');
          } else {
            console.error('[CallKit] No value in registration data! Keys received:', Object.keys(data || {}));
          }
        });
        console.log('[CallKit] Registration listener set up:', registrationListener);
        
        // Register for VoIP notifications with retry
        console.log('[CallKit] Calling attemptVoIPRegistration()...');
        await attemptVoIPRegistration();
        console.log('[CallKit] attemptVoIPRegistration() completed');
        
        // Listen for call answered
        console.log('[CallKit] Setting up callAnswered listener...');
        CallKitVoip.addListener('callAnswered', async (data: any) => {
          console.log('[CallKit] ====== CALL ANSWERED ======');
          console.log('[CallKit] Answer data:', JSON.stringify(data));
          console.log('[CallKit] Data keys:', Object.keys(data || {}));
          
          // Configure audio session to keep call active during TTS
          try {
            if ((CallKitVoip as any).configureAudioSession) {
              console.log('[CallKit] Configuring audio session to keep call active...');
              await (CallKitVoip as any).configureAudioSession();
              console.log('[CallKit] Audio session configured');
            } else {
              console.log('[CallKit] configureAudioSession not available');
            }
          } catch (e) {
            console.log('[CallKit] configureAudioSession error (non-critical):', e);
          }
          
          // FIRST: Try to use data directly from the callback payload
          let eventToPlay: CallKitEvent | null = null;
          
          if (data?.eventId || data?.eventTitle || data?.name) {
            console.log('[CallKit] Building event from payload data');
            // Capture time from multiple possible fields
            const eventTime = data.eventTime || data.time || '';
            console.log('[CallKit] Captured eventTime:', eventTime, 'from data.eventTime:', data.eventTime, 'data.time:', data.time);
            
            eventToPlay = {
              id: data.eventId || data.id || data.connectionId || 'call-event',
              title: data.eventTitle || data.name || 'Evento',
              emoji: data.eventEmoji || '📅',
              time: eventTime,
              location: data.eventLocation || data.location || '',
            };
            // Also update the ref for consistency
            setCurrentEvent(eventToPlay);
          } else {
            // FALLBACK: Use the ref if available
            console.log('[CallKit] Payload has no event data, trying ref...');
            eventToPlay = currentEventRef.current;
          }
          
          console.log('[CallKit] Event to play TTS:', JSON.stringify(eventToPlay));
          console.log('[CallKit] Event time for TTS:', eventToPlay?.time);
          
          if (eventToPlay) {
            console.log('[CallKit] Playing TTS for event:', eventToPlay.title, 'time:', eventToPlay.time);
            
            // SAVE: Mark call as answered in database
            if (eventToPlay.id && eventToPlay.id !== 'call-event') {
              console.log('[CallKit] Saving call answered to database for event:', eventToPlay.id);
              try {
                const { error } = await supabase
                  .from('events')
                  .update({ 
                    call_alert_answered: true,
                    call_alert_answered_at: new Date().toISOString(),
                    call_alert_outcome: 'answered'
                  })
                  .eq('id', eventToPlay.id);
                
                if (error) {
                  console.error('[CallKit] Error saving call answered:', error);
                } else {
                  console.log('[CallKit] ✅ Call answered saved to database');
                }
              } catch (e) {
                console.error('[CallKit] Exception saving call answered:', e);
              }
            }
            
            // Wait only 300ms for audio session to stabilize (TTS is already pre-loaded)
            console.log('[CallKit] Waiting 300ms for audio session...');
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Play TTS using pre-loaded audio if available
            await playTTS(eventToPlay);
            console.log('[CallKit] TTS playback finished');
            // Call stays active - user can hang up manually or it will timeout
          } else {
            console.error('[CallKit] NO EVENT DATA AVAILABLE FOR TTS!');
            console.error('[CallKit] currentEventRef.current:', currentEventRef.current);
            console.error('[CallKit] Payload data:', data);
          }
        });
        
        // Listen for call started (incoming call) - PRE-LOAD TTS HERE
        console.log('[CallKit] Setting up callStarted listener...');
        CallKitVoip.addListener('callStarted', async (data: any) => {
          console.log('[CallKit] ====== CALL STARTED ======');
          console.log('[CallKit] Start data:', JSON.stringify(data));
          
          // Clear previous preloaded TTS
          preloadedTTSRef.current = null;
          preloadingTTSRef.current = null;
          
          // Store the event data from push notification
          if (data.eventId) {
            const eventData = {
              id: data.eventId,
              title: data.eventTitle || data.name || 'Evento',
              emoji: data.eventEmoji || '📅',
              time: data.eventTime,
              location: data.eventLocation,
            };
            console.log('[CallKit] Setting current event:', JSON.stringify(eventData));
            setCurrentEvent(eventData);
            
            // PRE-LOAD TTS IMMEDIATELY when phone starts ringing
            console.log('[CallKit] 🚀 PRE-LOADING TTS while phone rings...');
            const language = currentLanguageRef.current;
            
            preloadingTTSRef.current = (async () => {
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
                  console.log('[CallKit] ✅ TTS PRE-LOADED! Length:', ttsData.audioContent.length);
                  preloadedTTSRef.current = ttsData.audioContent;
                  return ttsData.audioContent;
                }
                return null;
              } catch (e) {
                console.error('[CallKit] Pre-load TTS exception:', e);
                return null;
              }
            })();
          } else {
            console.warn('[CallKit] No eventId in callStarted data');
          }
        });
        
        // Listen for call ended
        console.log('[CallKit] Setting up callEnded listener...');
        CallKitVoip.addListener('callEnded', async (data: any) => {
          console.log('[CallKit] ====== CALL ENDED ======');
          console.log('[CallKit] End data:', JSON.stringify(data));
          
          // Check if call was answered (TTS was playing means it was answered)
          const wasAnswered = isCallingTTSRef.current;
          
          // IMPORTANT: Stop TTS immediately when call ends
          isCallingTTSRef.current = false;
          
          // Stop audio completely - clear source first to stop all playback
          if (audioRef.current) {
            console.log('[CallKit] Stopping audio playback...');
            try {
              audioRef.current.pause();
              audioRef.current.src = ''; // Clear source to fully stop
              audioRef.current.load(); // Reset audio element
            } catch (e) {
              console.log('[CallKit] Error stopping audio:', e);
            }
            audioRef.current = null;
          }
          
          // If call was NOT answered (missed/declined), update database
          const eventId = data?.eventId || currentEventRef.current?.id;
          if (eventId && eventId !== 'call-event' && !wasAnswered) {
            console.log('[CallKit] Call was NOT answered, marking as missed for event:', eventId);
            try {
              // Check current outcome first - don't overwrite 'answered'
              const { data: eventData } = await supabase
                .from('events')
                .select('call_alert_outcome')
                .eq('id', eventId)
                .maybeSingle();
              
              if (eventData?.call_alert_outcome !== 'answered') {
                const { error } = await supabase
                  .from('events')
                  .update({ call_alert_outcome: 'missed' })
                  .eq('id', eventId);
                
                if (error) {
                  console.error('[CallKit] Error saving call missed:', error);
                } else {
                  console.log('[CallKit] ✅ Call marked as missed in database');
                }
              }
            } catch (e) {
              console.error('[CallKit] Exception saving call missed:', e);
            }
          }
          
          cleanupCall();
        });
        
        console.log('[CallKit] ====== CALLKIT INIT COMPLETE ======');
        console.log('[CallKit] All listeners are now active');
        
      } catch (error) {
        console.error('[CallKit] ====== INIT FAILED ======');
        console.error('[CallKit] Error type:', typeof error);
        console.error('[CallKit] Error:', error);
        console.error('[CallKit] Error message:', (error as any)?.message);
        console.error('[CallKit] Error stack:', (error as any)?.stack);
      }
    };

    initCallKit();

    return () => {
      if (callKitPluginRef.current) {
        console.log('[CallKit] Cleanup: Removing all listeners');
        callKitPluginRef.current.removeAllListeners?.();
      }
    };
  }, [saveVoIPToken, attemptVoIPRegistration]);

  // Listen for auth state changes to register VoIP token when user logs in
  useEffect(() => {
    if (!isIOSNative()) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[CallKit] Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[CallKit] User signed in, checking for pending token...');
        
        // If we have a pending token, save it now
        if (pendingTokenRef.current) {
          console.log('[CallKit] Saving pending token after login');
          await saveVoIPToken(pendingTokenRef.current);
        } else {
          // Re-trigger registration to get a fresh token
          console.log('[CallKit] No pending token, re-registering...');
          hasRegisteredRef.current = false;
          await attemptVoIPRegistration();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [saveVoIPToken, attemptVoIPRegistration]);


  // Register for VoIP (called manually if needed) - returns status
  const registerVoIPToken = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    console.log('[CallKit] ====== MANUAL REGISTRATION ======');
    console.log('[CallKit] Is iOS native:', isIOSNative());
    console.log('[CallKit] Plugin loaded:', !!callKitPluginRef.current);
    
    if (!isIOSNative()) {
      console.log('[CallKit] Not on iOS native, skipping manual registration');
      return { success: false, message: 'Disponível apenas em dispositivos iOS' };
    }
    
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[CallKit] No user logged in');
      return { success: false, message: 'Usuário não logado' };
    }
    
    if (!callKitPluginRef.current) {
      console.log('[CallKit] Plugin not loaded, trying to load...');
      try {
        const { CallKitVoip } = await import('capacitor-plugin-callkit-voip');
        callKitPluginRef.current = CallKitVoip;
        console.log('[CallKit] Plugin loaded dynamically');
      } catch (e) {
        console.error('[CallKit] Failed to load plugin:', e);
        return { success: false, message: 'Plugin CallKit não disponível' };
      }
    }
    
    try {
      console.log('[CallKit] Calling register()...');
      const result = await callKitPluginRef.current.register();
      console.log('[CallKit] Manual registration result:', JSON.stringify(result));
      console.log('[CallKit] Manual registration triggered - waiting for token callback...');
      
      // Token will be saved via the 'registration' listener
      return { success: true, message: 'Registro iniciado. Aguardando token do iOS...' };
    } catch (error) {
      console.error('[CallKit] Manual registration failed:', error);
      return { success: false, message: `Erro: ${(error as Error).message}` };
    }
  }, []);

  // Cleanup call state
  const cleanupCall = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    isCallingTTSRef.current = false;
    setIsPlaying(false);
    setIsCallVisible(false);
    setCurrentEvent(null);
  }, []);

  // Play TTS after call is answered - max 15 seconds with loop
  // Play TTS via native Swift (AVAudioPlayer) - works during CallKit call
  const playTTS = useCallback(async (event: CallKitEvent) => {
    if (isCallingTTSRef.current) {
      console.log('[CallKit] TTS already in progress');
      return;
    }
    
    isCallingTTSRef.current = true;
    setIsPlaying(true);
    
    const MAX_CALL_DURATION = 20000; // 20 segundos máximo
    let callTimeoutId: NodeJS.Timeout | null = null;
    
    // Função para encerrar chamada
    const endCallAndCleanup = async () => {
      console.log('[CallKit] Ending call after timeout or completion');
      
      if (callTimeoutId) {
        clearTimeout(callTimeoutId);
        callTimeoutId = null;
      }
      
      // Stop native TTS playback
      if (isIOSNative() && callKitPluginRef.current?.stopTTSAudio) {
        try {
          await callKitPluginRef.current.stopTTSAudio();
          console.log('[CallKit] Native TTS stopped');
        } catch (e) {
          console.log('[CallKit] Error stopping native TTS:', e);
        }
      }
      
      // Also stop web audio fallback if used
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      setIsPlaying(false);
      isCallingTTSRef.current = false;
      
      // End CallKit call using endCallFromJS
      if (callKitPluginRef.current && currentEventRef.current) {
        const endCallFn = callKitPluginRef.current.endCallFromJS || callKitPluginRef.current.endCall;
        if (endCallFn) {
          console.log('[CallKit] Calling endCallFromJS to end call after TTS');
          try {
            await endCallFn({ id: currentEventRef.current.id });
          } catch (e) {
            console.log('[CallKit] Error ending call:', e);
          }
        }
      }
      
      setTimeout(() => {
        cleanupCall();
      }, 500);
    };
    
    try {
      const language = currentLanguageRef.current;
      
      console.log('[CallKit] Requesting TTS for:', event.title, 'time:', event.time);
      
      // Check if TTS was pre-loaded during callStarted
      let base64Audio: string | null = preloadedTTSRef.current;
      
      if (base64Audio) {
        console.log('[CallKit] ✅ Using PRE-LOADED TTS audio!');
      } else if (preloadingTTSRef.current) {
        // TTS is still loading, wait for it
        console.log('[CallKit] ⏳ Waiting for pre-loading TTS to finish...');
        base64Audio = await preloadingTTSRef.current;
      }
      
      // Fallback: fetch TTS if not pre-loaded
      if (!base64Audio) {
        console.log('[CallKit] 📥 Fetching TTS (not pre-loaded)...');
        const { data, error } = await supabase.functions.invoke('text-to-speech', {
          body: { 
            titulo: event.title,
            hora: event.time || '',
            language: language,
          }
        });

        if (error) {
          console.error('[CallKit] TTS error:', error);
          throw error;
        }
        
        base64Audio = data?.audioContent || null;
      }

      if (base64Audio) {
        console.log('[CallKit] TTS audio received, base64 length:', base64Audio.length);
        
        // Timeout máximo de 20 segundos
        callTimeoutId = setTimeout(() => {
          console.log('[CallKit] Max call duration reached (20s)');
          endCallAndCleanup();
        }, MAX_CALL_DURATION);
        
        // Try to play via native Swift AVAudioPlayer (works during CallKit call)
        if (isIOSNative() && callKitPluginRef.current?.playTTSAudio) {
          console.log('[CallKit] Playing TTS via native Swift AVAudioPlayer');
          
          try {
            const result = await callKitPluginRef.current.playTTSAudio({ audio: base64Audio });
            console.log('[CallKit] Native TTS playback result:', JSON.stringify(result));
            
            if (result?.playing) {
              console.log('[CallKit] ✅ Native TTS is playing!');
              // Let it play until timeout, native player handles loops
              return;
            }
          } catch (nativeError) {
            console.error('[CallKit] Native TTS failed, trying web fallback:', nativeError);
          }
        }
        
        // FALLBACK: Web Audio API (may not work during CallKit call)
        console.log('[CallKit] Using web audio fallback');
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const audioBlob = new Blob([bytes], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Loop infinito do TTS até o timeout
        const playAudioLoop = () => {
          if (!isCallingTTSRef.current || !audioUrl) {
            return;
          }
          
          audioRef.current = new Audio(audioUrl);
          
          audioRef.current.onended = () => {
            if (isCallingTTSRef.current) {
              setTimeout(() => {
                if (isCallingTTSRef.current) {
                  playAudioLoop();
                }
              }, 800);
            }
          };
          
          audioRef.current.onerror = () => {
            console.error('[CallKit] Audio playback error');
            URL.revokeObjectURL(audioUrl);
            endCallAndCleanup();
          };
          
          audioRef.current.play().catch(err => {
            console.error('[CallKit] Failed to play audio:', err);
          });
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

  // Show call (for web fallback or manual trigger)
  const showCall = useCallback((event: CallKitEvent, language: string = 'pt-BR') => {
    currentLanguageRef.current = language;
    setCurrentEvent(event);
    
    if (isIOSNative() && callKitPluginRef.current) {
      // On iOS, we typically receive calls via VoIP push
      // But this can be used to simulate/test
      console.log('[CallKit] showCall called - on iOS this should come via VoIP push');
      setIsCallVisible(true);
    } else {
      // Non-iOS: use the fallback call screen
      setIsCallVisible(true);
    }
  }, []);

  // Handle answer (called from UI or CallKit)
  const handleAnswer = useCallback(() => {
    if (isCallingTTSRef.current) {
      console.log('[CallKit] Already processing answer');
      return;
    }
    
    if (currentEventRef.current) {
      playTTS(currentEventRef.current);
    }
  }, [playTTS]);

  // Handle decline
  const handleDecline = useCallback(() => {
    if (callKitPluginRef.current && currentEventRef.current) {
      // Use endCallFromJS (forked plugin) or fallback to endCall
      const endCallFn = callKitPluginRef.current.endCallFromJS || callKitPluginRef.current.endCall;
      endCallFn?.({ id: currentEventRef.current.id });
    }
    cleanupCall();
  }, [cleanupCall]);

  // Handle snooze (remind in 10 minutes)
  const handleSnooze = useCallback(() => {
    const event = currentEventRef.current;
    const language = currentLanguageRef.current;
    
    if (callKitPluginRef.current && event) {
      // Use endCallFromJS (forked plugin) or fallback to endCall
      const endCallFn = callKitPluginRef.current.endCallFromJS || callKitPluginRef.current.endCall;
      endCallFn?.({ id: event.id });
    }
    
    cleanupCall();
    
    if (event) {
      // Schedule reminder in 10 minutes
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
