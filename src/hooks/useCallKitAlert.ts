import { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

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
  registerVoIPToken: () => Promise<void>;
}

// Check if running on iOS native device
const isIOSNative = () => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
};

export const useCallKitAlert = (): UseCallKitAlertReturn => {
  const [isCallVisible, setIsCallVisible] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<CallKitEvent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentLanguageRef = useRef('pt-BR');
  const currentEventRef = useRef<CallKitEvent | null>(null);
  const isCallingTTSRef = useRef(false);
  const callKitPluginRef = useRef<any>(null);

  // Sync currentEvent to ref
  useEffect(() => {
    currentEventRef.current = currentEvent;
  }, [currentEvent]);

  // Initialize CallKit plugin on iOS
  useEffect(() => {
    const initCallKit = async () => {
      if (!isIOSNative()) {
        console.log('[CallKit] Not on iOS native, skipping initialization');
        return;
      }

      try {
        console.log('[CallKit] ====== STARTING CALLKIT INIT ======');
        console.log('[CallKit] Platform:', Capacitor.getPlatform());
        console.log('[CallKit] Is native:', Capacitor.isNativePlatform());
        
        // Dynamic import to avoid errors on non-native platforms
        const { CallKitVoip } = await import('capacitor-plugin-callkit-voip');
        callKitPluginRef.current = CallKitVoip;
        
        console.log('[CallKit] Plugin loaded successfully');
        console.log('[CallKit] Available methods:', Object.keys(CallKitVoip));
        
        // Listen for registration token BEFORE registering
        console.log('[CallKit] Setting up registration listener...');
        (CallKitVoip as any).addListener('registration', async (data: { token: string }) => {
          console.log('[CallKit] ====== VOIP TOKEN RECEIVED ======');
          console.log('[CallKit] Token length:', data.token?.length);
          console.log('[CallKit] Token preview:', data.token?.substring(0, 30) + '...');
          await saveVoIPToken(data.token);
        });
        
        // Register for VoIP notifications
        console.log('[CallKit] Calling register()...');
        const registerResult = await CallKitVoip.register();
        console.log('[CallKit] Register result:', JSON.stringify(registerResult));
        console.log('[CallKit] Registered for VoIP push successfully');
        
        // Listen for call answered
        CallKitVoip.addListener('callAnswered', (data: any) => {
          console.log('[CallKit] ====== CALL ANSWERED ======');
          console.log('[CallKit] Answer data:', JSON.stringify(data));
          const event = currentEventRef.current;
          if (event) {
            playTTS(event);
          }
        });
        
        // Listen for call started (incoming call)
        CallKitVoip.addListener('callStarted', (data: any) => {
          console.log('[CallKit] ====== CALL STARTED ======');
          console.log('[CallKit] Start data:', JSON.stringify(data));
          // Store the event data from push notification
          if (data.eventId) {
            setCurrentEvent({
              id: data.eventId,
              title: data.eventTitle || data.name || 'Evento',
              emoji: data.eventEmoji || '📅',
              time: data.eventTime,
              location: data.eventLocation,
            });
            setIsCallVisible(true);
          }
        });
        
        // Listen for call ended
        CallKitVoip.addListener('callEnded', (data: any) => {
          console.log('[CallKit] ====== CALL ENDED ======');
          console.log('[CallKit] End data:', JSON.stringify(data));
          cleanupCall();
        });
        
        console.log('[CallKit] ====== CALLKIT INIT COMPLETE ======');
        
      } catch (error) {
        console.error('[CallKit] ====== INIT FAILED ======');
        console.error('[CallKit] Error:', error);
        console.error('[CallKit] Error message:', (error as any)?.message);
      }
    };

    initCallKit();

    return () => {
      if (callKitPluginRef.current) {
        console.log('[CallKit] Removing all listeners');
        callKitPluginRef.current.removeAllListeners?.();
      }
    };
  }, []);

  // Save VoIP token to Supabase
  const saveVoIPToken = async (token: string) => {
    console.log('[CallKit] ====== SAVING VOIP TOKEN ======');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[CallKit] Current user:', user?.id);
      
      if (!user) {
        console.log('[CallKit] No user logged in, cannot save VoIP token');
        return;
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
      } else {
        console.log('[CallKit] ====== TOKEN SAVED SUCCESSFULLY ======');
        console.log('[CallKit] Updated profile:', JSON.stringify(data));
      }
    } catch (error) {
      console.error('[CallKit] Error saving VoIP token:', error);
    }
  };

  // Register for VoIP (called manually if needed)
  const registerVoIPToken = useCallback(async () => {
    console.log('[CallKit] ====== MANUAL REGISTRATION ======');
    console.log('[CallKit] Is iOS native:', isIOSNative());
    console.log('[CallKit] Plugin loaded:', !!callKitPluginRef.current);
    
    if (!isIOSNative()) {
      console.log('[CallKit] Not on iOS native, skipping manual registration');
      return;
    }
    
    if (!callKitPluginRef.current) {
      console.log('[CallKit] Plugin not loaded, trying to load...');
      try {
        const { CallKitVoip } = await import('capacitor-plugin-callkit-voip');
        callKitPluginRef.current = CallKitVoip;
        console.log('[CallKit] Plugin loaded dynamically');
      } catch (e) {
        console.error('[CallKit] Failed to load plugin:', e);
        return;
      }
    }
    
    try {
      console.log('[CallKit] Calling register()...');
      const result = await callKitPluginRef.current.register();
      console.log('[CallKit] Manual registration result:', JSON.stringify(result));
      console.log('[CallKit] Manual registration triggered successfully');
    } catch (error) {
      console.error('[CallKit] Manual registration failed:', error);
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
