import { useState, useEffect } from 'react';
import { Mic, X, Loader2, Send } from 'lucide-react';

interface AudioRecordingOverlayProps {
  isRecording: boolean;
  isSendingAudio: boolean;
  onCancel: () => void;
  onStopAndSend: () => void;
  recordingDuration: number;
}

const AudioRecordingOverlay = ({
  isRecording,
  isSendingAudio,
  onCancel,
  onStopAndSend,
  recordingDuration,
}: AudioRecordingOverlayProps) => {
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if nothing is happening
  if (!isRecording && !isSendingAudio) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 safe-area-bottom">
      <div className="bg-background/95 backdrop-blur-xl border-t border-border/20 px-4 py-4">
        {/* Recording State */}
        {isRecording && !isSendingAudio && (
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
                  Gravando... {formatTime(recordingDuration)}
                </span>
              </div>
            </div>
            
            {/* Send button */}
            <button
              onClick={onStopAndSend}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center"
            >
              <Send className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>
        )}

        {/* Sending Audio State */}
        {isSendingAudio && (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-foreground">Enviando áudio...</span>
            </div>
            
            {/* Skeleton animation */}
            <div className="w-full max-w-xs space-y-2">
              <div className="h-3 bg-muted rounded-full animate-pulse w-full" />
              <div className="h-3 bg-muted rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioRecordingOverlay;
