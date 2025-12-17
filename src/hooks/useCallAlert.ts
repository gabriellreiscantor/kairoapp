import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export const useCallAlert = (): UseCallAlertReturn => {
  const [isCallVisible, setIsCallVisible] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<CallAlertEvent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const vibrationIntervalRef = useRef<number | null>(null);
  const isCallingTTSRef = useRef(false);
  const currentLanguageRef = useRef('pt-BR');

  // Initialize ringtone audio
  useEffect(() => {
    ringtoneRef.current = new Audio();
    
    return () => {
      stopRingtone();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Start vibration pattern
  const startVibration = useCallback(() => {
    if ('vibrate' in navigator) {
      vibrationIntervalRef.current = window.setInterval(() => {
        navigator.vibrate([500, 200, 500, 200, 500]);
      }, 2000);
      
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
  }, []);

  // Stop vibration
  const stopVibration = useCallback(() => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }, []);

  // Start ringtone (using Web Audio API for a simple tone)
  const startRingtone = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = () => {
        if (!isCallVisible) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      };

      playTone();
      const interval = setInterval(() => {
        if (isCallVisible) {
          playTone();
        } else {
          clearInterval(interval);
        }
      }, 1500);

      (ringtoneRef.current as any) = { audioContext, interval };
    } catch (error) {
      console.error('Failed to play ringtone:', error);
    }
  }, [isCallVisible]);

  // Stop ringtone
  const stopRingtone = useCallback(() => {
    try {
      if (ringtoneRef.current && (ringtoneRef.current as any).interval) {
        clearInterval((ringtoneRef.current as any).interval);
      }
      if (ringtoneRef.current && (ringtoneRef.current as any).audioContext) {
        (ringtoneRef.current as any).audioContext.close();
      }
    } catch (error) {
      console.error('Failed to stop ringtone:', error);
    }
  }, []);

  // Generate and play TTS with multilingual support (plays 3-4 times then auto-closes)
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

  // Show call screen with language support
  const showCall = useCallback((event: CallAlertEvent, language: string = 'pt-BR') => {
    currentLanguageRef.current = language;
    setCurrentEvent(event);
    setIsCallVisible(true);
    startVibration();
    startRingtone();
  }, [startVibration, startRingtone]);

  // Handle answer
  const handleAnswer = useCallback(() => {
    // Prevent multiple answer clicks
    if (isCallingTTSRef.current) {
      console.log('Already processing answer, ignoring');
      return;
    }
    
    stopVibration();
    stopRingtone();
    
    if (currentEvent) {
      playTTS(currentEvent);
    }
  }, [stopVibration, stopRingtone, currentEvent, playTTS]);

  // Handle decline
  const handleDecline = useCallback(() => {
    stopVibration();
    stopRingtone();
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    isCallingTTSRef.current = false;
    setIsCallVisible(false);
    setCurrentEvent(null);
    setIsPlaying(false);
  }, [stopVibration, stopRingtone]);

  // Handle snooze (remind in 10 minutes)
  const handleSnooze = useCallback(() => {
    stopVibration();
    stopRingtone();
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    isCallingTTSRef.current = false;
    setIsCallVisible(false);
    setIsPlaying(false);
    
    // Re-show in 10 minutes
    if (currentEvent) {
      const event = currentEvent;
      const language = currentLanguageRef.current;
      setTimeout(() => {
        showCall(event, language);
      }, 10 * 60 * 1000); // 10 minutes
    }
    
    setCurrentEvent(null);
  }, [stopVibration, stopRingtone, currentEvent, showCall]);

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
