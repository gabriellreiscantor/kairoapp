import React, { useLayoutEffect, useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, animate, PanInfo } from 'framer-motion';

interface SwipeablePagesProps {
  currentIndex: number;
  onPageChange: (index: number) => void;
  onSwipeLeftAtStart?: () => void;
  onSwipeRightAtEnd?: () => void;
  children: React.ReactNode[];
  className?: string;
}

const SwipeablePages: React.FC<SwipeablePagesProps> = ({
  currentIndex,
  onPageChange,
  onSwipeLeftAtStart,
  onSwipeRightAtEnd,
  children,
  className = '',
}) => {
  const [mounted, setMounted] = useState(false);
  const x = useMotionValue(0);
  const prevIndexRef = useRef(currentIndex);
  
  // Get page width directly from window
  const getPageWidth = () => window.innerWidth;
  
  // Set initial position BEFORE first paint (useLayoutEffect)
  useLayoutEffect(() => {
    const width = getPageWidth();
    x.set(-currentIndex * width);
    setMounted(true);
  }, []);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const width = getPageWidth();
      x.set(-currentIndex * width);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentIndex, x]);
  
  // Animate on page change (after mount)
  useEffect(() => {
    if (mounted && prevIndexRef.current !== currentIndex) {
      const width = getPageWidth();
      animate(x, -currentIndex * width, {
        type: 'spring',
        stiffness: 400,
        damping: 35,
      });
      prevIndexRef.current = currentIndex;
    }
  }, [currentIndex, mounted, x]);
  
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const width = getPageWidth();
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const threshold = width * 0.25;
    
    let newIndex = currentIndex;
    
    if (Math.abs(offset) > threshold || Math.abs(velocity) > 300) {
      if (offset > 0) {
        // Swipe right -> previous page
        if (currentIndex > 0) {
          newIndex = currentIndex - 1;
        } else {
          onSwipeLeftAtStart?.();
        }
      } else {
        // Swipe left -> next page
        if (currentIndex < children.length - 1) {
          newIndex = currentIndex + 1;
        } else {
          onSwipeRightAtEnd?.();
        }
      }
    }
    
    // ALWAYS snap to target page
    animate(x, -newIndex * width, {
      type: 'spring',
      stiffness: 400,
      damping: 35,
    });
    
    if (newIndex !== currentIndex) {
      onPageChange(newIndex);
    }
  };
  
  const pageWidth = getPageWidth();
  
  return (
    <div 
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ opacity: mounted ? 1 : 0 }}
    >
      <motion.div
        className="flex h-full touch-pan-y"
        style={{ 
          x,
          width: `${children.length * 100}vw`,
        }}
        drag="x"
        dragConstraints={{ 
          left: -(children.length - 1) * pageWidth, 
          right: 0 
        }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        dragMomentum={false}
      >
        {React.Children.map(children, (child, index) => (
          <div 
            key={index}
            className="h-full flex-shrink-0"
            style={{ width: '100vw' }}
          >
            {child}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default SwipeablePages;
