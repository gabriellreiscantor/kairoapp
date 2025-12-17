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
  showCall: (event: CallAlertEvent) => void;
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

  // Initialize ringtone audio
  useEffect(() => {
    // Create a simple ringtone using Web Audio API oscillator
    // This is a fallback - in production you'd use a real ringtone file
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
      // Vibrate pattern: vibrate 500ms, pause 500ms, repeat
      vibrationIntervalRef.current = window.setInterval(() => {
        navigator.vibrate([500, 200, 500, 200, 500]);
      }, 2000);
      
      // Initial vibration
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
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      };

      // Play tone pattern
      playTone();
      const interval = setInterval(() => {
        if (isCallVisible) {
          playTone();
        } else {
          clearInterval(interval);
        }
      }, 1500);

      // Store for cleanup
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

  // Generate and play TTS
  const playTTS = useCallback(async (event: CallAlertEvent) => {
    setIsPlaying(true);
    
    try {
      // Build reminder text
      let text = `Lembrete: ${event.title}`;
      if (event.time) {
        text += ` às ${event.time}`;
      }
      if (event.location) {
        text += ` em ${event.location}`;
      }
      
      console.log('Requesting TTS for:', text);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: 'nova' } // nova is a friendly female voice
      });

      if (error) {
        console.error('TTS error:', error);
        throw error;
      }

      if (data?.audioContent) {
        // Create audio from base64
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
          { type: 'audio/mp3' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
          // Auto-close after TTS finishes
          setTimeout(() => {
            setIsCallVisible(false);
            setCurrentEvent(null);
          }, 1000);
        };
        
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Failed to play TTS:', error);
      setIsPlaying(false);
      // Still close after error
      setTimeout(() => {
        setIsCallVisible(false);
        setCurrentEvent(null);
      }, 3000);
    }
  }, []);

  // Show call screen
  const showCall = useCallback((event: CallAlertEvent) => {
    setCurrentEvent(event);
    setIsCallVisible(true);
    startVibration();
    startRingtone();
  }, [startVibration, startRingtone]);

  // Handle answer
  const handleAnswer = useCallback(() => {
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
    
    setIsCallVisible(false);
    setIsPlaying(false);
    
    // Re-show in 10 minutes
    if (currentEvent) {
      const event = currentEvent;
      setTimeout(() => {
        showCall(event);
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
