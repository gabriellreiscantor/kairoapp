import React, { useLayoutEffect, useEffect, useState, useRef, useCallback } from 'react';
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
  const [pageWidth, setPageWidth] = useState(() => window.innerWidth);
  const [mounted, setMounted] = useState(false);
  const x = useMotionValue(0);
  const prevIndexRef = useRef(currentIndex);
  
  // Update pageWidth on resize
  const updatePageWidth = useCallback(() => {
    const width = window.innerWidth;
    setPageWidth(width);
    return width;
  }, []);
  
  // Set initial position BEFORE first paint (useLayoutEffect)
  useLayoutEffect(() => {
    // Wait a tick for any scrollbar to disappear and layout to stabilize
    requestAnimationFrame(() => {
      const width = updatePageWidth();
      x.set(-currentIndex * width);
      setMounted(true);
    });
  }, []);
  
  // Handle window resize - update width and reposition
  useEffect(() => {
    const handleResize = () => {
      const width = updatePageWidth();
      x.set(-currentIndex * width);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentIndex, x, updatePageWidth]);
  
  // Animate on page change (after mount)
  useEffect(() => {
    if (mounted && prevIndexRef.current !== currentIndex) {
      animate(x, -currentIndex * pageWidth, {
        type: 'spring',
        stiffness: 400,
        damping: 35,
      });
      prevIndexRef.current = currentIndex;
    }
  }, [currentIndex, mounted, x, pageWidth]);
  
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const threshold = pageWidth * 0.2;
    
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
    animate(x, -newIndex * pageWidth, {
      type: 'spring',
      stiffness: 400,
      damping: 35,
    });
    
    if (newIndex !== currentIndex) {
      onPageChange(newIndex);
    }
  };
  
  // Calculate total width and constraints
  const totalWidth = children.length * pageWidth;
  const minX = -(children.length - 1) * pageWidth;
  
  return (
    <div 
      className={`relative h-full overflow-hidden ${className}`}
      style={{ 
        opacity: mounted ? 1 : 0,
        width: '100vw',
        maxWidth: '100vw',
        overflow: 'hidden',
      }}
    >
      <motion.div
        className="flex h-full touch-pan-y"
        style={{ 
          x,
          width: `${children.length * pageWidth}px`,
          display: 'flex',
        }}
        drag="x"
        dragConstraints={{ 
          left: minX, 
          right: 0 
        }}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
        dragMomentum={false}
      >
        {React.Children.map(children, (child, index) => (
          <div 
            key={index}
            className="h-full flex-shrink-0"
            style={{ 
              width: `${pageWidth}px`,
              minWidth: `${pageWidth}px`,
              maxWidth: `${pageWidth}px`,
            }}
          >
            {child}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default SwipeablePages;
