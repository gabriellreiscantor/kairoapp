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
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  const x = useMotionValue(0);
  const prevIndexRef = useRef(currentIndex);
  
  // Medir largura real do container
  const measureContainer = useCallback(() => {
    if (containerRef.current) {
      return containerRef.current.getBoundingClientRect().width;
    }
    return 0;
  }, []);
  
  // Medir antes do primeiro paint
  useLayoutEffect(() => {
    const measure = () => {
      const width = measureContainer();
      if (width > 0) {
        setPageWidth(width);
        x.set(-currentIndex * width);
        setMounted(true);
      }
    };
    
    measure();
    // Fallback se ainda não tiver dimensão
    if (!mounted) {
      requestAnimationFrame(measure);
    }
  }, []);
  
  // ResizeObserver para mudanças de tamanho do container
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0 && width !== pageWidth) {
          setPageWidth(width);
          x.set(-currentIndex * width);
        }
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [currentIndex, x, pageWidth]);
  
  // Animar quando página muda (após mount)
  useEffect(() => {
    if (mounted && prevIndexRef.current !== currentIndex && pageWidth > 0) {
      animate(x, -currentIndex * pageWidth, {
        type: 'spring',
        stiffness: 600,
        damping: 40,
      });
      prevIndexRef.current = currentIndex;
    }
  }, [currentIndex, mounted, x, pageWidth]);
  
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (pageWidth === 0) return;
    
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
    
    // SEMPRE snap para a página target
    animate(x, -newIndex * pageWidth, {
      type: 'spring',
      stiffness: 600,
      damping: 40,
    });
    
    if (newIndex !== currentIndex) {
      onPageChange(newIndex);
    }
  };
  
  const minX = -(children.length - 1) * pageWidth;
  
  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ opacity: mounted ? 1 : 0 }}
    >
      <motion.div
        className="h-full touch-pan-y"
        style={{ 
          x,
          display: 'flex',
          flexDirection: 'row',
          width: `${children.length * pageWidth}px`,
        }}
        drag="x"
        dragConstraints={{ left: minX, right: 0 }}
        dragElastic={0.02}
        onDragEnd={handleDragEnd}
        dragMomentum={false}
      >
        {React.Children.map(children, (child, index) => (
          <div 
            key={index}
            style={{ 
              flex: `0 0 ${pageWidth}px`,
              width: `${pageWidth}px`,
              height: '100%',
              overflow: 'hidden',
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
