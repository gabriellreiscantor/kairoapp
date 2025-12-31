import { useSwipeable } from 'react-swipeable';

interface EdgeSwipeZoneProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  children: React.ReactNode;
  edgeWidth?: number;
}

const EdgeSwipeZone = ({ 
  onSwipeLeft, 
  onSwipeRight, 
  children,
  edgeWidth = 24
}: EdgeSwipeZoneProps) => {
  const leftHandlers = useSwipeable({
    onSwipedRight: onSwipeRight,
    trackMouse: true,
    delta: 50,
    preventScrollOnSwipe: false,
  });

  const rightHandlers = useSwipeable({
    onSwipedLeft: onSwipeLeft,
    trackMouse: true,
    delta: 50,
    preventScrollOnSwipe: false,
  });

  return (
    <div className="relative w-full h-full">
      {children}
      
      {/* Edge esquerda - invisível */}
      {onSwipeRight && (
        <div 
          {...leftHandlers}
          className="absolute left-0 top-0 bottom-0 z-40"
          style={{ 
            width: edgeWidth, 
            touchAction: 'pan-y'
          }}
        />
      )}
      
      {/* Edge direita - invisível */}
      {onSwipeLeft && (
        <div 
          {...rightHandlers}
          className="absolute right-0 top-0 bottom-0 z-40"
          style={{ 
            width: edgeWidth,
            touchAction: 'pan-y'
          }}
        />
      )}
    </div>
  );
};

export default EdgeSwipeZone;
