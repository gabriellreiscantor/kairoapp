import { createContext, useContext, ReactNode } from 'react';
import { useCallKitAlert } from '@/hooks/useCallKitAlert';

interface CallKitEvent {
  id: string;
  title: string;
  emoji?: string;
  time?: string;
  location?: string;
}

interface CallKitContextType {
  isCallVisible: boolean;
  currentEvent: CallKitEvent | null;
  showCall: (event: CallKitEvent, language?: string) => void;
  handleAnswer: () => void;
  handleDecline: () => void;
  handleSnooze: () => void;
  isPlaying: boolean;
  registerVoIPToken: () => Promise<{ success: boolean; message: string }>;
}

const CallKitContext = createContext<CallKitContextType | null>(null);

export const CallKitProvider = ({ children }: { children: ReactNode }) => {
  // ⚡ ISSO RODA IMEDIATAMENTE NO APP START - antes do login
  const callKit = useCallKitAlert();
  
  return (
    <CallKitContext.Provider value={callKit}>
      {children}
    </CallKitContext.Provider>
  );
};

export const useCallKit = () => {
  const context = useContext(CallKitContext);
  if (!context) {
    throw new Error('useCallKit must be used within CallKitProvider');
  }
  return context;
};
