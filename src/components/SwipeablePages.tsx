import React, { useRef, useEffect, useState } from 'react';
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
  const [pageWidth, setPageWidth] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const x = useMotionValue(0);
  
  // Update page width on resize - use window.innerWidth for reliable 100vw
  useEffect(() => {
    const updateWidth = () => {
      const width = window.innerWidth;
      setPageWidth(width);
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  
  // Initialize position and animate on page change
  useEffect(() => {
    if (pageWidth > 0) {
      const targetX = -currentIndex * pageWidth;
      
      if (!isInitialized) {
        // First render - set position immediately without animation
        x.set(targetX);
        setIsInitialized(true);
      } else {
        // Subsequent changes - animate
        animate(x, targetX, {
          type: 'spring',
          stiffness: 500,
          damping: 40,
          mass: 0.8,
        });
      }
    }
  }, [currentIndex, pageWidth, isInitialized, x]);
  
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.x;
    const offset = info.offset.x;
    const threshold = pageWidth * 0.2;
    
    let newIndex = currentIndex;
    
    // Determine direction based on offset and velocity
    if (Math.abs(offset) > threshold || Math.abs(velocity) > 500) {
      if (offset > 0 && velocity >= 0) {
        // Swiped right = go to previous page
        if (currentIndex === 0) {
          // At first page, trigger settings callback
          onSwipeLeftAtStart?.();
        } else {
          newIndex = currentIndex - 1;
        }
      } else if (offset < 0 && velocity <= 0) {
        // Swiped left = go to next page
        if (currentIndex === children.length - 1) {
          // At last page, trigger callback
          onSwipeRightAtEnd?.();
        } else {
          newIndex = Math.min(children.length - 1, currentIndex + 1);
        }
      }
    }
    
    // Animate to the target page with firm snap
    animate(x, -newIndex * pageWidth, {
      type: 'spring',
      stiffness: 500,
      damping: 40,
      mass: 0.8,
    });
    
    if (newIndex !== currentIndex) {
      onPageChange(newIndex);
    }
  };
  
  // Calculate drag constraints
  const minX = -(children.length - 1) * pageWidth;
  const maxX = 0;
  
  // Don't render until we have page width
  if (pageWidth === 0) {
    return <div className={`w-full h-full ${className}`} />;
  }
  
  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <motion.div
        className="flex h-full"
        style={{ 
          x,
          width: `${children.length * pageWidth}px`,
        }}
        drag="x"
        dragConstraints={{ left: minX, right: maxX }}
        dragElastic={0.05}
        onDragEnd={handleDragEnd}
        dragMomentum={false}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 50 }}
      >
        {React.Children.map(children, (child, index) => (
          <div 
            key={index}
            className="h-full flex-shrink-0"
            style={{ width: `${pageWidth}px` }}
          >
            {child}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default SwipeablePages;
