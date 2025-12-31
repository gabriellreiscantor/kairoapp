import React, { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const x = useMotionValue(0);
  
  // Update page width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setPageWidth(containerRef.current.offsetWidth);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  
  // Animate to current page when index changes externally
  useEffect(() => {
    if (pageWidth > 0) {
      animate(x, -currentIndex * pageWidth, {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      });
    }
  }, [currentIndex, pageWidth, x]);
  
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
    
    // Animate to the target page
    animate(x, -newIndex * pageWidth, {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    });
    
    if (newIndex !== currentIndex) {
      onPageChange(newIndex);
    }
  };
  
  // Calculate drag constraints
  const minX = -(children.length - 1) * pageWidth;
  const maxX = 0;
  
  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
    >
      <motion.div
        className="flex h-full"
        style={{ 
          x,
          width: `${children.length * 100}%`,
        }}
        drag="x"
        dragConstraints={{ left: minX, right: maxX }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        dragMomentum={false}
      >
        {React.Children.map(children, (child, index) => (
          <div 
            key={index}
            className="h-full flex-shrink-0 relative overflow-hidden"
            style={{ width: `${100 / children.length}%` }}
          >
            {child}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default SwipeablePages;
