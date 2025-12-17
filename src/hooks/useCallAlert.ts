import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

interface CallAlertEvent {
  id: string;
  title: string;
  emoji?: string;
  time?: string;
  location?: string;
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

export const useCallAlert = (): UseCallAlertReturn => {
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

  // Cleanup all timers
  const cleanupTimers = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
  }, []);

  // Initialize cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupTimers();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [cleanupTimers]);

  // Start vibration pattern - uses native Haptics on iOS/Android, falls back to Web API
  const startVibration = useCallback(async () => {
    if (isNativeDevice()) {
      // Native vibration pattern using Capacitor Haptics
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
      
      // Initial vibration
      vibratePattern();
      
      // Repeat pattern every 2 seconds
      vibrationIntervalRef.current = window.setInterval(() => {
        vibratePattern();
      }, 2000);
    } else {
      // Web fallback
      if ('vibrate' in navigator) {
        vibrationIntervalRef.current = window.setInterval(() => {
          navigator.vibrate([500, 200, 500, 200, 500]);
        }, 2000);
        
        navigator.vibrate([500, 200, 500, 200, 500]);
      }
    }
  }, []);

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

  // Play realistic phone ringtone (Brazilian standard: 425Hz, dual-tone pattern)
  const playRingTone = useCallback((audioContext: AudioContext) => {
    // Brazilian phone ring: two short bursts
    const playBurst = (startTime: number, duration: number) => {
      // Primary frequency (425Hz - Brazilian standard)
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

      // Secondary frequency (480Hz - adds richness)
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
    // Ring pattern: burst-pause-burst (like real phone)
    playBurst(now, 0.4);
    playBurst(now + 0.5, 0.4);
  }, []);

  // Start ringtone with realistic phone sound
  const startRingtone = useCallback(() => {
    try {
      ringCountRef.current = 0;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // Play initial ring
      playRingTone(audioContext);
      ringCountRef.current = 1;
      
      // Ring every 4 seconds (realistic phone cadence)
      ringtoneIntervalRef.current = window.setInterval(() => {
        if (ringCountRef.current >= MAX_RING_CYCLES) {
          // Stop after max rings - call not answered
          handleMissedCall();
          return;
        }
        
        playRingTone(audioContext);
        ringCountRef.current++;
      }, 4000);
      
    } catch (error) {
      console.error('Failed to play ringtone:', error);
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

  // Handle missed call (not answered after timeout or max rings)
  const handleMissedCall = useCallback(() => {
    stopVibration();
    stopRingtone();
    cleanupTimers();
    
    setIsCallVisible(false);
    
    const event = currentEvent;
    const language = currentLanguageRef.current;
    
    // Check if we should retry
    if (attemptCountRef.current < MAX_ATTEMPTS && event) {
      console.log(`Call missed. Attempt ${attemptCountRef.current}/${MAX_ATTEMPTS}. Retrying in 5 minutes...`);
      
      // Schedule retry in 5 minutes
      setTimeout(() => {
        if (event) {
          attemptCountRef.current++;
          showCallInternal(event, language);
        }
      }, RETRY_DELAY_MS);
    } else {
      console.log('Max attempts reached. No more retries.');
      attemptCountRef.current = 0;
      setCurrentEvent(null);
    }
  }, [currentEvent, stopVibration, stopRingtone, cleanupTimers]);

  // Internal show call (used for retries)
  const showCallInternal = useCallback((event: CallAlertEvent, language: string = 'pt-BR') => {
    currentLanguageRef.current = language;
    setCurrentEvent(event);
    setIsCallVisible(true);
    ringCountRef.current = 0;
    
    startVibration();
    startRingtone();
    
    // Set timeout for 36 seconds
    callTimeoutRef.current = window.setTimeout(() => {
      handleMissedCall();
    }, CALL_TIMEOUT_MS);
  }, [startVibration, startRingtone, handleMissedCall]);

  // Generate and play TTS with multilingual support (plays 3 times then auto-closes)
  const playTTS = useCallback(async (event: CallAlertEvent) => {
    // Prevent multiple simultaneous TTS calls
    if (isCallingTTSRef.current) {
      console.log('TTS already in progress, ignoring duplicate call');
      return;
    }
    
    isCallingTTSRef.current = true;
    setIsPlaying(true);
    
    try {
      const language = currentLanguageRef.current;
      
      console.log('Requesting TTS for event:', event.title, 'Time:', event.time, 'Language:', language);
      
      // Call edge function with structured data for multilingual template
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
        // Decode base64 in chunks to prevent memory issues
        const base64 = data.audioContent;
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const audioBlob = new Blob([bytes], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        let playCount = 0;
        const maxPlays = 3; // Play 3 times then auto-close
        
        const playAudio = () => {
          audioRef.current = new Audio(audioUrl);
          
          audioRef.current.onended = () => {
            playCount++;
            if (playCount < maxPlays && isCallingTTSRef.current) {
              // Wait 1 second between plays
              setTimeout(() => {
                if (isCallingTTSRef.current) {
                  playAudio();
                }
              }, 1000);
            } else {
              // Done playing - auto-close
              setIsPlaying(false);
              isCallingTTSRef.current = false;
              attemptCountRef.current = 0; // Reset attempts on successful answer
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
      // Still close after error
      setTimeout(() => {
        setIsCallVisible(false);
        setCurrentEvent(null);
      }, 3000);
    }
  }, []);

  // Show call screen with language support (public API)
  const showCall = useCallback((event: CallAlertEvent, language: string = 'pt-BR') => {
    attemptCountRef.current = 1; // First attempt
    showCallInternal(event, language);
  }, [showCallInternal]);

  // Handle answer
  const handleAnswer = useCallback(() => {
    // Prevent multiple answer clicks
    if (isCallingTTSRef.current) {
      console.log('Already processing answer, ignoring');
      return;
    }
    
    // Clear timeout since call was answered
    cleanupTimers();
    stopVibration();
    stopRingtone();
    
    if (currentEvent) {
      playTTS(currentEvent);
    }
  }, [cleanupTimers, stopVibration, stopRingtone, currentEvent, playTTS]);

  // Handle decline
  const handleDecline = useCallback(() => {
    cleanupTimers();
    stopVibration();
    stopRingtone();
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    isCallingTTSRef.current = false;
    attemptCountRef.current = 0; // Reset attempts on decline
    setIsCallVisible(false);
    setCurrentEvent(null);
    setIsPlaying(false);
  }, [cleanupTimers, stopVibration, stopRingtone]);

  // Handle snooze (remind in 10 minutes)
  const handleSnooze = useCallback(() => {
    cleanupTimers();
    stopVibration();
    stopRingtone();
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    isCallingTTSRef.current = false;
    setIsCallVisible(false);
    setIsPlaying(false);
    
    // Re-show in 10 minutes (resets attempt counter)
    if (currentEvent) {
      const event = currentEvent;
      const language = currentLanguageRef.current;
      setTimeout(() => {
        attemptCountRef.current = 1; // Reset to first attempt for snooze
        showCallInternal(event, language);
      }, 10 * 60 * 1000); // 10 minutes
    }
    
    setCurrentEvent(null);
  }, [cleanupTimers, stopVibration, stopRingtone, currentEvent, showCallInternal]);

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
