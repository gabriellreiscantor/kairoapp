import { useState, useEffect } from 'react';
import { Mic, X, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioRecordingOverlayProps {
  isRecording: boolean;
  isTranscribing: boolean;
  transcribedText: string | null;
  onCancel: () => void;
  onConfirmSend: () => void;
  onRetry: () => void;
}

const AudioRecordingOverlay = ({
  isRecording,
  isTranscribing,
  transcribedText,
  onCancel,
  onConfirmSend,
  onRetry,
}: AudioRecordingOverlayProps) => {
  const [recordingTime, setRecordingTime] = useState(0);

  // Timer for recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      setRecordingTime(0);
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if nothing is happening
  if (!isRecording && !isTranscribing && !transcribedText) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 safe-area-bottom">
      <div className="bg-background/95 backdrop-blur-xl border-t border-border/20 px-4 py-4">
        {/* Recording State */}
        {isRecording && (
          <div className="flex items-center justify-between">
            <button
              onClick={onCancel}
              className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex-1 flex flex-col items-center gap-2">
              {/* Audio Wave Animation */}
              <div className="flex items-center gap-1 h-8">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary rounded-full audio-wave"
                    style={{
                      height: '100%',
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm text-foreground font-medium">
                  Gravando... {formatTime(recordingTime)}
                </span>
              </div>
            </div>
            
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center animate-pulse">
              <Mic className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
        )}

        {/* Transcribing State */}
        {isTranscribing && (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-foreground">Transcrevendo...</span>
            </div>
            
            {/* Skeleton animation for text preview */}
            <div className="w-full max-w-xs space-y-2">
              <div className="h-3 bg-muted rounded-full animate-pulse w-full" />
              <div className="h-3 bg-muted rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        )}

        {/* Transcription Preview State */}
        {transcribedText && !isRecording && !isTranscribing && (
          <div className="space-y-3">
            {/* Transcribed Text Preview */}
            <div className="bg-muted/50 rounded-2xl p-3 border border-border/20">
              <p className="text-sm text-foreground leading-relaxed">
                {transcribedText}
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 px-4 rounded-xl bg-muted text-foreground text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={onRetry}
                className="py-2.5 px-4 rounded-xl bg-muted text-foreground text-sm font-medium"
              >
                Regravar
              </button>
              <button
                onClick={onConfirmSend}
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioRecordingOverlay;
