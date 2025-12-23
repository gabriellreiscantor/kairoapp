import React, { useState } from 'react';
import { AlarmClock, ChevronRight, Phone, PhoneOff } from 'lucide-react';
import kairoLogo from '@/assets/kairo-fox-color.png';

interface CallScreenProps {
  isVisible: boolean;
  eventTitle: string;
  eventTime?: string;
  eventEmoji?: string;
  onAnswer: () => void;
  onDecline: () => void;
  onSnooze: () => void;
}

const CallScreen: React.FC<CallScreenProps> = ({
  isVisible,
  eventTitle,
  eventTime,
  eventEmoji,
  onAnswer,
  onDecline,
  onSnooze,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);

  const SWIPE_THRESHOLD = 150;

  const handleTouchStart = () => {
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const startX = 60; // Starting position of the button
    const newX = Math.max(0, Math.min(touch.clientX - startX, SWIPE_THRESHOLD));
    setDragX(newX);
  };

  const handleTouchEnd = () => {
    if (dragX >= SWIPE_THRESHOLD * 0.8) {
      setIsAnswering(true);
      setTimeout(() => {
        onAnswer();
        setIsAnswering(false);
        setDragX(0);
      }, 300);
    } else {
      setDragX(0);
    }
    setIsDragging(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #1a1a1a 0%, #2d2418 50%, #4a3728 100%)',
      }}
    >
      {/* Safe area top */}
      <div className="pt-[env(safe-area-inset-top)]" />

      {/* Header */}
      <div className="flex flex-col items-center pt-16 px-6">
        {/* App identifier */}
        <div className="flex items-center gap-2 mb-4">
          <img src={kairoLogo} alt="Horah" className="w-6 h-6 rounded-full" />
          <span className="text-white/60 text-sm">Áudio de Horah</span>
        </div>

        {/* Event title with time */}
        <h1 className="text-white text-3xl font-bold text-center">
          {eventEmoji && <span className="mr-2">{eventEmoji}</span>}
          {eventTitle}{eventTime && ` às ${eventTime}`}
        </h1>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Snooze button */}
      <div className="absolute right-6 bottom-48 flex flex-col items-center">
        <button
          onClick={onSnooze}
          className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20"
        >
          <AlarmClock className="w-6 h-6 text-white/80" />
        </button>
        <span className="text-white/60 text-xs mt-2">Lembre-me</span>
      </div>

      {/* Answer slider */}
      <div className="px-6 pb-12 pb-[calc(env(safe-area-inset-bottom)+48px)]">
        <div 
          className="relative h-16 rounded-full overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, #8b7355 0%, #a08060 50%, #8b7355 100%)',
          }}
        >
          {/* Slide text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white/50 text-lg font-medium ml-12">atender</span>
          </div>

          {/* Draggable button */}
          <button
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={onAnswer}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg transition-transform"
            style={{
              transform: `translate(${dragX}px, -50%)`,
            }}
          >
            <ChevronRight className="w-6 h-6 text-blue-500" />
            <ChevronRight className="w-6 h-6 text-blue-500 -ml-4" />
          </button>
        </div>

        {/* Decline button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={onDecline}
            className="w-14 h-14 rounded-full bg-red-500/80 flex items-center justify-center"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallScreen;
