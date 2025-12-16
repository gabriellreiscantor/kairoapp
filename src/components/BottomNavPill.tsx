import { LayoutGrid, Calendar, MessageCircle } from "lucide-react";

interface BottomNavPillProps {
  activeView: 'list' | 'calendar';
  onViewChange: (view: 'list' | 'calendar') => void;
  onChatOpen: () => void;
}

const BottomNavPill = ({ activeView, onViewChange, onChatOpen }: BottomNavPillProps) => {
  return (
    <div className="fixed bottom-4 left-0 right-0 px-4 safe-area-bottom z-50">
      <div className="flex items-center justify-between">
        {/* View Toggle Pill */}
        <div className="bg-kairo-surface-2/90 backdrop-blur-sm rounded-full p-1 flex items-center gap-0.5">
          <button
            onClick={() => onViewChange('list')}
            className={`px-3 py-2 rounded-full transition-all duration-150 ${
              activeView === 'list' 
                ? 'bg-foreground text-background' 
                : 'text-muted-foreground'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewChange('calendar')}
            className={`px-3 py-2 rounded-full transition-all duration-150 ${
              activeView === 'calendar' 
                ? 'bg-foreground text-background' 
                : 'text-muted-foreground'
            }`}
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Button */}
        <button
          onClick={onChatOpen}
          className="w-11 h-11 rounded-full bg-kairo-surface-2/90 backdrop-blur-sm border border-border/20 flex items-center justify-center transition-all duration-150 active:scale-95"
        >
          <MessageCircle className="w-5 h-5 text-foreground" />
        </button>
      </div>
    </div>
  );
};

export default BottomNavPill;
