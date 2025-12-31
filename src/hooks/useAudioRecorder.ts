import { useState, useRef, useCallback, useEffect } from 'react';
import { remoteLog } from '@/lib/remoteLogger';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  recordingDuration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ audio: string; duration: number } | null>;
  error: string | null;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      remoteLog.info('audio', 'recording_permission_request');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Try to use webm, fallback to mp4 or whatever is available
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
        'audio/wav',
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('Nenhum formato de áudio suportado');
      }

      remoteLog.info('audio', 'recording_started', { mimeType: selectedMimeType });
      recordingStartTimeRef.current = Date.now();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao iniciar gravação';
      remoteLog.error('audio', 'recording_start_error', { error: errorMessage });
      setError(errorMessage);
      throw err;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<{ audio: string; duration: number } | null> => {
    const finalDuration = recordingDuration;
    
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      const mediaRecorder = mediaRecorderRef.current;
      const duration = Date.now() - recordingStartTimeRef.current;

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        
        remoteLog.info('audio', 'recording_stopped', { 
          durationMs: duration,
          durationSeconds: finalDuration,
          blobSize: blob.size,
          mimeType,
        });
        
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove data URL prefix
          const base64Data = base64.split(',')[1];
          remoteLog.info('audio', 'recording_converted', { base64Length: base64Data?.length });
          resolve({ audio: base64Data, duration: finalDuration });
        };
        reader.onerror = () => {
          remoteLog.error('audio', 'recording_conversion_error');
          resolve(null);
        };
        reader.readAsDataURL(blob);
        
        setIsRecording(false);
        chunksRef.current = [];
      };

      mediaRecorder.stop();
    });
  }, [recordingDuration]);

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    error,
  };
};
