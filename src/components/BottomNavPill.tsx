import { LayoutGrid, Calendar, MessageCircle } from "lucide-react";

interface BottomNavPillProps {
  activeView: 'list' | 'calendar';
  onViewChange: (view: 'list' | 'calendar') => void;
  onChatOpen: () => void;
}

const BottomNavPill = ({ activeView, onViewChange, onChatOpen }: BottomNavPillProps) => {
  return (
    <div className="fixed bottom-6 left-0 right-0 px-6 safe-area-bottom z-50">
      <div className="flex items-center justify-between">
        {/* View Toggle Pill */}
        <div className="nav-pill">
          <button
            onClick={() => onViewChange('list')}
            className={`nav-pill-item ${activeView === 'list' ? 'active' : ''}`}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => onViewChange('calendar')}
            className={`nav-pill-item ${activeView === 'calendar' ? 'active' : ''}`}
          >
            <Calendar className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Button */}
        <button
          onClick={onChatOpen}
          className="w-14 h-14 rounded-full bg-kairo-surface-2 border border-border/30 flex items-center justify-center transition-all duration-200 active:scale-95 hover:bg-kairo-surface-3"
        >
          <MessageCircle className="w-6 h-6 text-foreground" />
        </button>
      </div>
    </div>
  );
};

export default BottomNavPill;
