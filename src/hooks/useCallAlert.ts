import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import type { NotificationPreferences } from './useNotificationPreferences';

interface CallAlertEvent {
  id: string;
  title: string;
  emoji?: string;
  time?: string;
  location?: string;
}

interface UseCallAlertOptions {
  preferences?: NotificationPreferences;
}

interface UseCallAlertReturn {
  isCallVisible: boolean;
  currentEvent: CallAlertEvent | null;
  showCall: (event: CallAlertEvent, language?: string) => void;
  handleAnswer: () => void;
  handleDecline: () => void;
  handleSnooze: () => void;
  isPlaying: boolean;
}

// Check if running on native device
const isNativeDevice = () => {
  return typeof (window as any).Capacitor !== 'undefined' && 
         (window as any).Capacitor.isNativePlatform?.();
};

// Constants for call behavior
const CALL_TIMEOUT_MS = 36000; // 36 seconds
const MAX_RING_CYCLES = 6; // ~6 rings in 36 seconds
const RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 2; // Maximum 2 attempts total

export const useCallAlert = (options: UseCallAlertOptions = {}): UseCallAlertReturn => {
  const { preferences } = options;
  const [isCallVisible, setIsCallVisible] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<CallAlertEvent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<number | null>(null);
  const vibrationIntervalRef = useRef<number | null>(null);
  const callTimeoutRef = useRef<number | null>(null);
  const ringCountRef = useRef(0);
  const attemptCountRef = useRef(0);
  const isCallingTTSRef = useRef(false);
  const currentLanguageRef = useRef('pt-BR');
  const currentEventRef = useRef<CallAlertEvent | null>(null);
  const shouldRetryRef = useRef(false);

  // Sync currentEvent to ref
  useEffect(() => {
    currentEventRef.current = currentEvent;
  }, [currentEvent]);

  // Stop vibration
  const stopVibration = useCallback(() => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if (!isNativeDevice() && 'vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }, []);

  // Stop ringtone
  const stopRingtone = useCallback(() => {
    try {
      if (ringtoneIntervalRef.current) {
        clearInterval(ringtoneIntervalRef.current);
        ringtoneIntervalRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } catch (error) {
      console.error('Failed to stop ringtone:', error);
    }
  }, []);

  // Cleanup all timers
  const cleanupTimers = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    stopRingtone();
    stopVibration();
  }, [stopRingtone, stopVibration]);

  // Initialize cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupTimers();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [cleanupTimers]);

  // Start vibration pattern
  const startVibration = useCallback(async () => {
    // Respect vibration preference
    if (preferences && !preferences.vibration_enabled) {
      console.log('[CallAlert] Vibration disabled by user preference');
      return;
    }

    if (isNativeDevice()) {
      const vibratePattern = async () => {
        try {
          await Haptics.notification({ type: NotificationType.Warning });
          await new Promise(resolve => setTimeout(resolve, 300));
          await Haptics.impact({ style: ImpactStyle.Heavy });
          await new Promise(resolve => setTimeout(resolve, 200));
          await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch (error) {
          console.error('Haptics error:', error);
        }
      };
      
      vibratePattern();
      vibrationIntervalRef.current = window.setInterval(() => {
        vibratePattern();
      }, 2000);
    } else {
      if ('vibrate' in navigator) {
        vibrationIntervalRef.current = window.setInterval(() => {
          navigator.vibrate([500, 200, 500, 200, 500]);
        }, 2000);
        navigator.vibrate([500, 200, 500, 200, 500]);
      }
    }
  }, [preferences]);

  // Play realistic phone ringtone
  const playRingTone = useCallback((audioContext: AudioContext) => {
    const playBurst = (startTime: number, duration: number) => {
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(425, startTime);
      gain1.gain.setValueAtTime(0.15, startTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.start(startTime);
      osc1.stop(startTime + duration);

      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, startTime);
      gain2.gain.setValueAtTime(0.1, startTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.start(startTime);
      osc2.stop(startTime + duration);
    };

    const now = audioContext.currentTime;
    playBurst(now, 0.4);
    playBurst(now + 0.5, 0.4);
  }, []);

  // Start ringtone
  const startRingtone = useCallback(() => {
    // Respect sound preference
    if (preferences && !preferences.sound_enabled) {
      console.log('[CallAlert] Sound disabled by user preference');
      return;
    }

    try {
      ringCountRef.current = 0;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      playRingTone(audioContext);
      ringCountRef.current = 1;
      
      ringtoneIntervalRef.current = window.setInterval(() => {
        if (ringCountRef.current >= MAX_RING_CYCLES) {
          shouldRetryRef.current = true;
          return;
        }
        
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          playRingTone(audioContextRef.current);
        }
        ringCountRef.current++;
      }, 4000);
      
    } catch (error) {
      console.error('Failed to play ringtone:', error);
    }
  }, [playRingTone, preferences]);

  // Handle missed call - schedules retry if needed
  const handleMissedCall = useCallback(() => {
    cleanupTimers();
    setIsCallVisible(false);
    
    const event = currentEventRef.current;
    const language = currentLanguageRef.current;
    
    if (attemptCountRef.current < MAX_ATTEMPTS && event) {
      console.log(`Call missed. Attempt ${attemptCountRef.current}/${MAX_ATTEMPTS}. Retrying in 5 minutes...`);
      
      setTimeout(() => {
        if (event) {
          attemptCountRef.current++;
          // Inline showCall logic to avoid circular dependency
          currentLanguageRef.current = language;
          setCurrentEvent(event);
          setIsCallVisible(true);
          ringCountRef.current = 0;
          shouldRetryRef.current = false;
          startVibration();
          startRingtone();
          
          callTimeoutRef.current = window.setTimeout(() => {
            shouldRetryRef.current = true;
          }, CALL_TIMEOUT_MS);
        }
      }, RETRY_DELAY_MS);
    } else {
      console.log('Max attempts reached. No more retries.');
      attemptCountRef.current = 0;
      setCurrentEvent(null);
    }
  }, [cleanupTimers, startVibration, startRingtone]);

  // Check for retry flag periodically
  useEffect(() => {
    const checkRetry = setInterval(() => {
      if (shouldRetryRef.current && isCallVisible) {
        shouldRetryRef.current = false;
        handleMissedCall();
      }
    }, 500);
    
    return () => clearInterval(checkRetry);
  }, [isCallVisible, handleMissedCall]);

  // Generate and play TTS
  const playTTS = useCallback(async (event: CallAlertEvent) => {
    if (isCallingTTSRef.current) {
      console.log('TTS already in progress, ignoring duplicate call');
      return;
    }
    
    isCallingTTSRef.current = true;
    setIsPlaying(true);
    
    try {
      const language = currentLanguageRef.current;
      
      console.log('Requesting TTS for event:', event.title, 'Time:', event.time, 'Language:', language);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          titulo: event.title,
          hora: event.time || '',
          language: language,
        }
      });

      if (error) {
        console.error('TTS error:', error);
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
              attemptCountRef.current = 0;
              URL.revokeObjectURL(audioUrl);
              setTimeout(() => {
                setIsCallVisible(false);
                setCurrentEvent(null);
              }, 500);
            }
          };
          
          audioRef.current.onerror = () => {
            console.error('Audio playback error');
            setIsPlaying(false);
            isCallingTTSRef.current = false;
            URL.revokeObjectURL(audioUrl);
          };
          
          audioRef.current.play();
        };
        
        playAudio();
      }
    } catch (error) {
      console.error('Failed to play TTS:', error);
      setIsPlaying(false);
      isCallingTTSRef.current = false;
      setTimeout(() => {
        setIsCallVisible(false);
        setCurrentEvent(null);
      }, 3000);
    }
  }, []);

  // Show call screen (public API)
  const showCall = useCallback((event: CallAlertEvent, language: string = 'pt-BR') => {
    attemptCountRef.current = 1;
    currentLanguageRef.current = language;
    shouldRetryRef.current = false;
    setCurrentEvent(event);
    setIsCallVisible(true);
    ringCountRef.current = 0;
    
    startVibration();
    startRingtone();
    
    callTimeoutRef.current = window.setTimeout(() => {
      shouldRetryRef.current = true;
    }, CALL_TIMEOUT_MS);
  }, [startVibration, startRingtone]);

  // Handle answer
  const handleAnswer = useCallback(() => {
    if (isCallingTTSRef.current) {
      console.log('Already processing answer, ignoring');
      return;
    }
    
    cleanupTimers();
    
    if (currentEventRef.current) {
      playTTS(currentEventRef.current);
    }
  }, [cleanupTimers, playTTS]);

  // Handle decline
  const handleDecline = useCallback(() => {
    cleanupTimers();
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    isCallingTTSRef.current = false;
    attemptCountRef.current = 0;
    shouldRetryRef.current = false;
    setIsCallVisible(false);
    setCurrentEvent(null);
    setIsPlaying(false);
  }, [cleanupTimers]);

  // Handle snooze (remind in 10 minutes)
  const handleSnooze = useCallback(() => {
    cleanupTimers();
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    isCallingTTSRef.current = false;
    shouldRetryRef.current = false;
    setIsCallVisible(false);
    setIsPlaying(false);
    
    const event = currentEventRef.current;
    const language = currentLanguageRef.current;
    
    if (event) {
      setTimeout(() => {
        attemptCountRef.current = 1;
        currentLanguageRef.current = language;
        setCurrentEvent(event);
        setIsCallVisible(true);
        ringCountRef.current = 0;
        startVibration();
        startRingtone();
        
        callTimeoutRef.current = window.setTimeout(() => {
          shouldRetryRef.current = true;
        }, CALL_TIMEOUT_MS);
      }, 10 * 60 * 1000);
    }
    
    setCurrentEvent(null);
  }, [cleanupTimers, startVibration, startRingtone]);

  // Cleanup on visibility change
  useEffect(() => {
    if (!isCallVisible) {
      stopVibration();
      stopRingtone();
    }
  }, [isCallVisible, stopVibration, stopRingtone]);

  return {
    isCallVisible,
    currentEvent,
    showCall,
    handleAnswer,
    handleDecline,
    handleSnooze,
    isPlaying,
  };
};
