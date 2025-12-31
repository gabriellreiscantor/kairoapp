import { Mic } from 'lucide-react';
import { useMemo } from 'react';

interface AudioMessageCardProps {
  duration: number; // duration in seconds
  transcription: string;
}

const AudioMessageCard = ({ duration, transcription }: AudioMessageCardProps) => {
  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate consistent waveform based on transcription hash
  const waveformHeights = useMemo(() => {
    // Use transcription as seed for consistent heights
    const seed = transcription.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return [...Array(20)].map((_, i) => {
      const pseudoRandom = Math.sin(seed * (i + 1) * 0.1) * 0.5 + 0.5;
      return Math.max(30, pseudoRandom * 100);
    });
  }, [transcription]);

  return (
    <div className="w-full max-w-[85%]">
      {/* Audio Visual */}
      <div className="bg-primary/20 border border-primary/30 rounded-2xl rounded-br-sm px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Mic Icon */}
          <div className="w-9 h-9 rounded-full bg-primary/30 flex items-center justify-center flex-shrink-0">
            <Mic className="w-4 h-4 text-primary" />
          </div>
          
          {/* Waveform visual (static) */}
          <div className="flex-1 flex items-center gap-[2px] h-5">
            {waveformHeights.map((height, i) => (
              <div
                key={i}
                className="w-[3px] bg-primary/50 rounded-full"
                style={{
                  height: `${height}%`,
                }}
              />
            ))}
          </div>
          
          {/* Duration */}
          <span className="text-xs text-foreground/70 font-medium flex-shrink-0">
            {formatDuration(duration)}
          </span>
        </div>
      </div>
      
      {/* Transcription below */}
      <div className="mt-1.5 px-2">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          "{transcription}"
        </p>
      </div>
    </div>
  );
};

export default AudioMessageCard;
