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
        CallKitVoip.addListener('callAnswered', (data: any) => {
          console.log('[CallKit] ====== CALL ANSWERED ======');
          console.log('[CallKit] Answer data:', JSON.stringify(data));
          const event = currentEventRef.current;
          console.log('[CallKit] Current event ref:', JSON.stringify(event));
          if (event) {
            console.log('[CallKit] Playing TTS for event:', event.title);
            playTTS(event);
          } else {
            console.warn('[CallKit] No current event to play TTS for!');
          }
        });
        
        // Listen for call started (incoming call)
        console.log('[CallKit] Setting up callStarted listener...');
        CallKitVoip.addListener('callStarted', (data: any) => {
          console.log('[CallKit] ====== CALL STARTED ======');
          console.log('[CallKit] Start data:', JSON.stringify(data));
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
            setIsCallVisible(true);
          } else {
            console.warn('[CallKit] No eventId in callStarted data');
          }
        });
        
        // Listen for call ended
        console.log('[CallKit] Setting up callEnded listener...');
        CallKitVoip.addListener('callEnded', (data: any) => {
          console.log('[CallKit] ====== CALL ENDED ======');
          console.log('[CallKit] End data:', JSON.stringify(data));
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

  // Play TTS after call is answered
  const playTTS = useCallback(async (event: CallKitEvent) => {
    if (isCallingTTSRef.current) {
      console.log('[CallKit] TTS already in progress');
      return;
    }
    
    isCallingTTSRef.current = true;
    setIsPlaying(true);
    
    try {
      const language = currentLanguageRef.current;
      
      console.log('[CallKit] Requesting TTS for:', event.title);
      
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

      if (data?.audioContent) {
        const base64 = data.audioContent;
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const audioBlob = new Blob([bytes], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        let playCount = 0;
        const maxPlays = 3;
        
        const playAudio = () => {
          audioRef.current = new Audio(audioUrl);
          
          audioRef.current.onended = () => {
            playCount++;
            if (playCount < maxPlays && isCallingTTSRef.current) {
              setTimeout(() => {
                if (isCallingTTSRef.current) {
                  playAudio();
                }
              }, 1000);
            } else {
              setIsPlaying(false);
              isCallingTTSRef.current = false;
              URL.revokeObjectURL(audioUrl);
              
              // End CallKit call after TTS
              if (callKitPluginRef.current && currentEventRef.current) {
                callKitPluginRef.current.endCall?.({ 
                  id: currentEventRef.current.id 
                });
              }
              
              setTimeout(() => {
                cleanupCall();
              }, 500);
            }
          };
          
          audioRef.current.onerror = () => {
            console.error('[CallKit] Audio playback error');
            setIsPlaying(false);
            isCallingTTSRef.current = false;
            URL.revokeObjectURL(audioUrl);
          };
          
          audioRef.current.play();
        };
        
        playAudio();
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
      callKitPluginRef.current.endCall?.({ 
        id: currentEventRef.current.id 
      });
    }
    cleanupCall();
  }, [cleanupCall]);

  // Handle snooze (remind in 10 minutes)
  const handleSnooze = useCallback(() => {
    const event = currentEventRef.current;
    const language = currentLanguageRef.current;
    
    if (callKitPluginRef.current && event) {
      callKitPluginRef.current.endCall?.({ id: event.id });
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
