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
        // Dynamic import to avoid errors on non-native platforms
        const { CallKitVoip } = await import('capacitor-plugin-callkit-voip');
        callKitPluginRef.current = CallKitVoip;
        
        console.log('[CallKit] Plugin loaded, registering...');
        
        // Register for VoIP notifications
        await CallKitVoip.register();
        console.log('[CallKit] Registered for VoIP push');
        
        // Listen for call answered
        CallKitVoip.addListener('callAnswered', (data: any) => {
          console.log('[CallKit] Call answered:', data);
          const event = currentEventRef.current;
          if (event) {
            playTTS(event);
          }
        });
        
        // Listen for call started (incoming call)
        CallKitVoip.addListener('callStarted', (data: any) => {
          console.log('[CallKit] Call started (incoming):', data);
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
          console.log('[CallKit] Call ended:', data);
          cleanupCall();
        });
        
        // Listen for registration token (using any type as plugin types may not include all events)
        (CallKitVoip as any).addListener('registration', async (data: { token: string }) => {
          console.log('[CallKit] Received VoIP token:', data.token.substring(0, 20) + '...');
          await saveVoIPToken(data.token);
        });
        
      } catch (error) {
        console.error('[CallKit] Failed to initialize:', error);
      }
    };

    initCallKit();

    return () => {
      if (callKitPluginRef.current) {
        callKitPluginRef.current.removeAllListeners?.();
      }
    };
  }, []);

  // Save VoIP token to Supabase
  const saveVoIPToken = async (token: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[CallKit] No user logged in, cannot save VoIP token');
        return;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          voip_token: token,
        })
        .eq('id', user.id);
      
      if (error) {
        console.error('[CallKit] Failed to save VoIP token:', error);
      } else {
        console.log('[CallKit] VoIP token saved to profile');
      }
    } catch (error) {
      console.error('[CallKit] Error saving VoIP token:', error);
    }
  };

  // Register for VoIP (called manually if needed)
  const registerVoIPToken = useCallback(async () => {
    if (!isIOSNative() || !callKitPluginRef.current) {
      console.log('[CallKit] Cannot register VoIP - not on iOS or plugin not loaded');
      return;
    }
    
    try {
      await callKitPluginRef.current.register();
      console.log('[CallKit] Manual registration triggered');
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
